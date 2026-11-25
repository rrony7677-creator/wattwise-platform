import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { EnergyRecord, IEnergyRecord } from '../models/EnergyRecord.js';
import { Meter } from '../models/Meter.js';
import { Organization } from '../models/Organization.js';
import { calculateCostAndCarbon } from '../services/costCarbon.service.js';
import { evaluateMeterAnomaly } from '../services/anomaly.service.js';
import { evaluateAndTriggerAlerts } from '../services/alertEngine.service.js';
import { runRealtimeSimulationTick } from '../services/simulator.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertEntityScopeAccess, buildScopedFilter } from '../middleware/rbac.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const createEnergyRecordSchema = z.object({
  meterId: z.string().min(1),
  consumptionKwh: z.coerce.number().min(0),
  timestamp: z.string().optional(),
  peakDemandKw: z.coerce.number().min(0).optional(),
  powerFactor: z.coerce.number().min(0.5).max(1).default(0.94),
});

export async function listEnergyRecords(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
    const buildingId =
      typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : '';
    const floorId = typeof req.query.floorId === 'string' ? req.query.floorId.trim() : '';
    const departmentId =
      typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : '';
    const meterId = typeof req.query.meterId === 'string' ? req.query.meterId.trim() : '';
    const isAnomaly =
      typeof req.query.isAnomaly === 'string' ? req.query.isAnomaly.trim() : '';
    const source = typeof req.query.source === 'string' ? req.query.source.trim() : '';
    const startDate =
      typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: FilterQuery<IEnergyRecord> = buildScopedFilter<IEnergyRecord>(user, {
      includeBuildingScope: true,
      includeDepartmentScope: true,
      includeMeterScope: true,
    });

    if (buildingId) filter.buildingId = toObjectId(buildingId);
    if (floorId) filter.floorId = toObjectId(floorId);
    if (departmentId) filter.departmentId = toObjectId(departmentId);
    if (meterId) filter.meterId = toObjectId(meterId);
    if (isAnomaly === 'true') filter.isAnomaly = true;
    if (isAnomaly === 'false') filter.isAnomaly = false;
    if (source && ['seed', 'manual', 'iot_simulator'].includes(source)) {
      filter.source = source as IEnergyRecord['source'];
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        dateFilter.$lte = end;
      }
      filter.timestamp = dateFilter;
    }

    // If user typed a search string q, match meters by code or name
    if (q) {
      const matchingMeters = await Meter.find({
        organizationId: toObjectId(user.organizationId),
        $or: [
          { meterCode: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();

      filter.meterId = { $in: matchingMeters.map((m) => m._id) };
    }

    const [records, total] = await Promise.all([
      EnergyRecord.find(filter)
        .populate('buildingId', 'name code')
        .populate('floorId', 'floorNumber name')
        .populate('departmentId', 'name code')
        .populate('meterId', 'meterCode name meterType')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EnergyRecord.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: records,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createEnergyRecord(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const payload = createEnergyRecordSchema.parse(req.body);

    const [organization, meter] = await Promise.all([
      Organization.findById(orgId).lean(),
      Meter.findOne({
        _id: toObjectId(payload.meterId),
        organizationId: orgId,
      }).lean(),
    ]);

    if (!organization) {
      throw new AppError(404, 'ORG_NOT_FOUND', 'Organization not found.');
    }

    if (!meter) {
      throw new AppError(
        400,
        'INVALID_METER_REFERENCE',
        'Specified electricity meter does not exist in your organization.'
      );
    }

    assertEntityScopeAccess(user, {
      organizationId: meter.organizationId,
      buildingId: meter.buildingId,
      departmentId: meter.departmentId,
      meterId: meter._id,
    });

    const recordTimestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
    if (Number.isNaN(recordTimestamp.getTime())) {
      throw new AppError(400, 'INVALID_TIMESTAMP', 'Invalid timestamp format.');
    }

    // Check for duplicate energy record on { meterId, timestamp } (Section 5 requirement)
    const existingDuplicate = await EnergyRecord.findOne({
      meterId: meter._id,
      timestamp: recordTimestamp,
    }).lean();

    if (existingDuplicate) {
      throw new AppError(
        409,
        'DUPLICATE_ENERGY_RECORD',
        `An energy record already exists for meter ${meter.meterCode} at ${recordTimestamp.toISOString()}.`
      );
    }

    const { estimatedCost, carbonKg } = calculateCostAndCarbon({
      consumptionKwh: payload.consumptionKwh,
      timestamp: recordTimestamp,
      baseTariffPerKwh: organization.baseTariffPerKwh,
      peakTariffPerKwh: organization.peakTariffPerKwh,
      carbonFactorKgPerKwh: organization.carbonFactorKgPerKwh,
    });

    const anomalyEval = await evaluateMeterAnomaly({
      organizationId: orgId,
      meterId: meter._id,
      consumptionKwh: payload.consumptionKwh,
      maxCapacityKw: meter.maxCapacityKw,
    });

    const peakDemandKw =
      payload.peakDemandKw !== undefined
        ? payload.peakDemandKw
        : Number((payload.consumptionKwh * 1.18).toFixed(2));

    const created = await EnergyRecord.create({
      organizationId: orgId,
      buildingId: meter.buildingId,
      floorId: meter.floorId,
      departmentId: meter.departmentId,
      meterId: meter._id,
      timestamp: recordTimestamp,
      consumptionKwh: Number(payload.consumptionKwh.toFixed(2)),
      estimatedCost,
      carbonKg,
      peakDemandKw,
      powerFactor: payload.powerFactor,
      isAnomaly: anomalyEval.isAnomaly,
      anomalyScore: anomalyEval.anomalyScore,
      source: 'manual',
    });

    await Meter.updateOne(
      { _id: meter._id },
      { $set: { lastReadingAt: recordTimestamp } }
    );

    const triggeredAlerts = await evaluateAndTriggerAlerts({
      record: created.toObject(),
      meter,
      baselineMean: anomalyEval.baselineMean,
    });

    const populated = await EnergyRecord.findById(created._id)
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber name')
      .populate('departmentId', 'name code')
      .populate('meterId', 'meterCode name meterType')
      .lean();

    invalidateOrgCache(user.organizationId);

    res.status(201).json({
      success: true,
      data: {
        record: populated,
        alertsTriggered: triggeredAlerts.length,
        alerts: triggeredAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerSimulationTick(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const result = await runRealtimeSimulationTick(user.organizationId);
    invalidateOrgCache(user.organizationId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
