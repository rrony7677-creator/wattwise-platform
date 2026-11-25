import { Organization } from '../models/Organization.js';
import { Meter } from '../models/Meter.js';
import { EnergyRecord, IEnergyRecord } from '../models/EnergyRecord.js';
import { IAlert } from '../models/Alert.js';
import { calculateCostAndCarbon } from './costCarbon.service.js';
import { evaluateMeterAnomaly } from './anomaly.service.js';
import { evaluateAndTriggerAlerts } from './alertEngine.service.js';
import { toObjectId } from '../types/index.js';

export interface SimulationTickResult {
  timestamp: string;
  recordsCreated: number;
  anomaliesDetected: number;
  alertsTriggered: number;
  sampleReadings: IEnergyRecord[];
  newAlerts: IAlert[];
}

/**
 * Bonus Challenge: Real-Time Energy Monitoring Simulation
 * Generates a realistic live time-series reading batch across active meters
 * in the user's organization, updates meter health telemetry, evaluates
 * statistical anomalies, and triggers threshold alerts.
 * 100% Stateless & Vercel Serverless compatible.
 */
export async function runRealtimeSimulationTick(
  organizationId: string,
  maxMetersToSimulate = 12
): Promise<SimulationTickResult> {
  const orgId = toObjectId(organizationId);
  const [organization, meters] = await Promise.all([
    Organization.findById(orgId).lean(),
    Meter.find({
      organizationId: orgId,
      status: { $in: ['active', 'warning'] },
    })
      .limit(maxMetersToSimulate)
      .lean(),
  ]);

  if (!organization || meters.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      recordsCreated: 0,
      anomaliesDetected: 0,
      alertsTriggered: 0,
      sampleReadings: [],
      newAlerts: [],
    };
  }

  // Normalize timestamp to unique minute/second so repeated live simulation clicks never collide
  const tickTimestamp = new Date();
  tickTimestamp.setMilliseconds(0);

  const createdRecords: IEnergyRecord[] = [];
  const triggeredAlerts: IAlert[] = [];
  let anomaliesDetected = 0;

  const hour = tickTimestamp.getUTCHours();
  const isBusinessHours = hour >= 8 && hour <= 19;
  const diurnalFactor = isBusinessHours ? 1.15 : 0.48;

  for (const meter of meters) {
    // Base load by meter type
    const typeBaseMap: Record<string, number> = {
      Main: 95,
      Machinery: 75,
      HVAC: 55,
      ServerRack: 48,
      Lighting: 22,
      Submeter: 32,
    };

    const baseKwh = (typeBaseMap[meter.meterType] || 35) * diurnalFactor;
    // ~12% probability of simulating a noticeable spike so users testing live simulation see real anomalies & alerts
    const injectSpike = Math.random() < 0.12;
    const multiplier = injectSpike
      ? 1.75 + Math.random() * 0.65
      : 0.85 + Math.random() * 0.3;

    const consumptionKwh = Number((baseKwh * multiplier).toFixed(2));
    const peakDemandKw = Number((consumptionKwh * (1.12 + Math.random() * 0.25)).toFixed(2));
    const powerFactor = Number((0.86 + Math.random() * 0.12).toFixed(2));

    const { estimatedCost, carbonKg } = calculateCostAndCarbon({
      consumptionKwh,
      timestamp: tickTimestamp,
      baseTariffPerKwh: organization.baseTariffPerKwh,
      peakTariffPerKwh: organization.peakTariffPerKwh,
      carbonFactorKgPerKwh: organization.carbonFactorKgPerKwh,
    });

    const anomalyEval = await evaluateMeterAnomaly({
      organizationId: orgId,
      meterId: meter._id,
      consumptionKwh,
      maxCapacityKw: meter.maxCapacityKw,
    });

    if (anomalyEval.isAnomaly) {
      anomaliesDetected++;
    }

    const recordDoc = await EnergyRecord.findOneAndUpdate(
      {
        meterId: meter._id,
        timestamp: tickTimestamp,
      },
      {
        $set: {
          organizationId: orgId,
          buildingId: meter.buildingId,
          floorId: meter.floorId,
          departmentId: meter.departmentId,
          meterId: meter._id,
          timestamp: tickTimestamp,
          consumptionKwh,
          estimatedCost,
          carbonKg,
          peakDemandKw,
          powerFactor,
          isAnomaly: anomalyEval.isAnomaly,
          anomalyScore: anomalyEval.anomalyScore,
          source: 'iot_simulator',
        },
      },
      { new: true, upsert: true }
    );

    // Update meter heartbeat & subtle health score telemetry
    const healthDelta = injectSpike ? -1 : Math.random() > 0.5 ? 0 : 1;
    const updatedHealth = Math.min(100, Math.max(68, (meter.healthScore || 95) + healthDelta));

    await Meter.updateOne(
      { _id: meter._id },
      {
        $set: {
          lastReadingAt: tickTimestamp,
          healthScore: updatedHealth,
          status: updatedHealth < 80 ? 'warning' : 'active',
        },
      }
    );

    const recordObj = recordDoc.toObject();
    createdRecords.push(recordObj);

    const alerts = await evaluateAndTriggerAlerts({
      record: recordObj,
      meter: { ...meter, healthScore: updatedHealth },
      baselineMean: anomalyEval.baselineMean,
    });

    triggeredAlerts.push(...alerts);
  }

  return {
    timestamp: tickTimestamp.toISOString(),
    recordsCreated: createdRecords.length,
    anomaliesDetected,
    alertsTriggered: triggeredAlerts.length,
    sampleReadings: createdRecords.slice(0, 6),
    newAlerts: triggeredAlerts,
  };
}
