import { FilterQuery } from 'mongoose';
import { EnergyRecord, IEnergyRecord } from '../models/EnergyRecord.js';
import { Building } from '../models/Building.js';
import { Department } from '../models/Department.js';
import { Meter } from '../models/Meter.js';
import { Alert } from '../models/Alert.js';
import { buildScopedFilter } from '../middleware/rbac.middleware.js';
import { AuthUserContext, toObjectId } from '../types/index.js';

export interface AggregationFilterParams {
  user: AuthUserContext;
  startDate?: string;
  endDate?: string;
  buildingId?: string;
  floorId?: string;
  departmentId?: string;
  meterId?: string;
}

export function resolveDateWindow(startDateStr?: string, endDateStr?: string): {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  daysSpan: number;
} {
  const end = endDateStr ? new Date(endDateStr) : new Date();
  if (endDateStr && endDateStr.length <= 10) {
    end.setUTCHours(23, 59, 59, 999);
  }

  const start = startDateStr
    ? new Date(startDateStr)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const durationMs = Math.max(24 * 60 * 60 * 1000, end.getTime() - start.getTime());
  const daysSpan = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd, daysSpan };
}

export function buildRecordMatchQuery(
  params: AggregationFilterParams,
  dateWindow: { start: Date; end: Date },
  ignoreDepartmentScopeForComparison = false
): FilterQuery<IEnergyRecord> {
  const filter: FilterQuery<IEnergyRecord> = buildScopedFilter<IEnergyRecord>(params.user, {
    includeBuildingScope: true,
    includeDepartmentScope: !ignoreDepartmentScopeForComparison,
    includeMeterScope: true,
  });

  filter.timestamp = {
    $gte: dateWindow.start,
    $lte: dateWindow.end,
  };

  if (params.buildingId) filter.buildingId = toObjectId(params.buildingId);
  if (params.floorId) filter.floorId = toObjectId(params.floorId);
  if (params.departmentId) filter.departmentId = toObjectId(params.departmentId);
  if (params.meterId) filter.meterId = toObjectId(params.meterId);

  return filter;
}

/**
 * Generates the complete Organization Dashboard Overview (Section 3C):
 * - Total Energy Consumption, Total Cost, Total Carbon
 * - Average Daily Usage, Peak Consumption, Lowest Consumption
 * - Previous Month/Period Comparison
 * - Building-wise, Department-wise, and Meter-wise Consumption
 * - Active Alerts Count
 */
export async function getDashboardOverview(params: AggregationFilterParams) {
  const dateWindow = resolveDateWindow(params.startDate, params.endDate);
  const currentMatch = buildRecordMatchQuery(params, {
    start: dateWindow.start,
    end: dateWindow.end,
  });
  const previousMatch = buildRecordMatchQuery(params, {
    start: dateWindow.prevStart,
    end: dateWindow.prevEnd,
  });

  const orgId = toObjectId(params.user.organizationId);

  const [
    currentStats,
    dailyBuckets,
    previousStats,
    buildingAgg,
    departmentAgg,
    meterAgg,
    alertCounts,
    buildings,
    departments,
    meters,
  ] = await Promise.all([
    EnergyRecord.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: null,
          totalConsumptionKwh: { $sum: '$consumptionKwh' },
          totalCostUsd: { $sum: '$estimatedCost' },
          totalCarbonKg: { $sum: '$carbonKg' },
          peakConsumptionKwh: { $max: '$consumptionKwh' },
          lowestConsumptionKwh: { $min: '$consumptionKwh' },
          recordsCount: { $sum: 1 },
        },
      },
    ]),
    EnergyRecord.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          dailyKwh: { $sum: '$consumptionKwh' },
        },
      },
    ]),
    EnergyRecord.aggregate([
      { $match: previousMatch },
      {
        $group: {
          _id: null,
          previousTotalKwh: { $sum: '$consumptionKwh' },
          previousTotalCostUsd: { $sum: '$estimatedCost' },
        },
      },
    ]),
    EnergyRecord.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$buildingId',
          kwh: { $sum: '$consumptionKwh' },
          cost: { $sum: '$estimatedCost' },
          carbonKg: { $sum: '$carbonKg' },
        },
      },
      { $sort: { kwh: -1 } },
    ]),
    EnergyRecord.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$departmentId',
          kwh: { $sum: '$consumptionKwh' },
          cost: { $sum: '$estimatedCost' },
        },
      },
      { $sort: { kwh: -1 } },
    ]),
    EnergyRecord.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: '$meterId',
          kwh: { $sum: '$consumptionKwh' },
          cost: { $sum: '$estimatedCost' },
        },
      },
      { $sort: { kwh: -1 } },
      { $limit: 12 },
    ]),
    Alert.aggregate([
      {
        $match: buildScopedFilter(params.user, {
          includeBuildingScope: true,
          includeDepartmentScope: true,
          includeMeterScope: true,
        }),
      },
      {
        $group: {
          _id: { status: '$status', severity: '$severity' },
          count: { $sum: 1 },
        },
      },
    ]),
    Building.find({ organizationId: orgId }).select('name code').lean(),
    Department.find({ organizationId: orgId })
      .populate('buildingId', 'name')
      .select('name code buildingId monthlyBudgetUsd')
      .lean(),
    Meter.find({ organizationId: orgId })
      .select('meterCode name meterType status healthScore')
      .lean(),
  ]);

  const curr = currentStats[0] || {
    totalConsumptionKwh: 0,
    totalCostUsd: 0,
    totalCarbonKg: 0,
    peakConsumptionKwh: 0,
    lowestConsumptionKwh: 0,
    recordsCount: 0,
  };

  const prev = previousStats[0] || {
    previousTotalKwh: 0,
    previousTotalCostUsd: 0,
  };

  const activeDaysCount = Math.max(1, dailyBuckets.length || dateWindow.daysSpan);
  const averageDailyUsageKwh = Number((curr.totalConsumptionKwh / activeDaysCount).toFixed(2));

  const consumptionDeltaPct =
    prev.previousTotalKwh > 0
      ? Number(
          (
            ((curr.totalConsumptionKwh - prev.previousTotalKwh) / prev.previousTotalKwh) *
            100
          ).toFixed(1)
        )
      : 0;

  const costDeltaPct =
    prev.previousTotalCostUsd > 0
      ? Number(
          (((curr.totalCostUsd - prev.previousTotalCostUsd) / prev.previousTotalCostUsd) * 100).toFixed(
            1
          )
        )
      : 0;

  const bldgLookup = new Map(buildings.map((b) => [String(b._id), b]));
  const deptLookup = new Map(departments.map((d) => [String(d._id), d]));
  const meterLookup = new Map(meters.map((m) => [String(m._id), m]));

  const totalKwhSafe = Math.max(1, curr.totalConsumptionKwh);

  const buildingWiseConsumption = buildingAgg.map((b) => {
    const info = bldgLookup.get(String(b._id));
    return {
      buildingId: String(b._id),
      name: info?.name || 'Building',
      code: info?.code || 'BLD',
      kwh: Number((b.kwh || 0).toFixed(2)),
      cost: Number((b.cost || 0).toFixed(2)),
      carbonKg: Number((b.carbonKg || 0).toFixed(2)),
      percentage: Number((((b.kwh || 0) / totalKwhSafe) * 100).toFixed(1)),
    };
  });

  const departmentWiseConsumption = departmentAgg.map((d) => {
    const info = deptLookup.get(String(d._id));
    const bldgObj = info?.buildingId as unknown as { name?: string } | undefined;
    return {
      departmentId: String(d._id),
      name: info?.name || 'Department',
      code: info?.code || 'DEPT',
      buildingName: bldgObj?.name || 'Building',
      kwh: Number((d.kwh || 0).toFixed(2)),
      cost: Number((d.cost || 0).toFixed(2)),
      budgetUsd: info?.monthlyBudgetUsd || 1500,
      percentage: Number((((d.kwh || 0) / totalKwhSafe) * 100).toFixed(1)),
    };
  });

  const meterWiseConsumption = meterAgg.map((m) => {
    const info = meterLookup.get(String(m._id));
    return {
      meterId: String(m._id),
      meterCode: info?.meterCode || 'MTR',
      name: info?.name || 'Smart Meter',
      meterType: info?.meterType || 'Submeter',
      status: info?.status || 'active',
      healthScore: info?.healthScore ?? 98,
      kwh: Number((m.kwh || 0).toFixed(2)),
      cost: Number((m.cost || 0).toFixed(2)),
    };
  });

  const activeAlertsCount = {
    new: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
  };

  for (const item of alertCounts) {
    const st = item._id?.status;
    const sev = item._id?.severity;
    if (st === 'New') activeAlertsCount.new += item.count;
    if (st === 'Acknowledged') activeAlertsCount.acknowledged += item.count;
    if (st === 'Resolved') activeAlertsCount.resolved += item.count;
    if (st !== 'Resolved' && sev === 'critical') activeAlertsCount.critical += item.count;
  }

  return {
    totalConsumptionKwh: Number((curr.totalConsumptionKwh || 0).toFixed(2)),
    totalCostUsd: Number((curr.totalCostUsd || 0).toFixed(2)),
    totalCarbonKg: Number((curr.totalCarbonKg || 0).toFixed(2)),
    averageDailyUsageKwh,
    peakConsumptionKwh: Number((curr.peakConsumptionKwh || 0).toFixed(2)),
    lowestConsumptionKwh: Number((curr.lowestConsumptionKwh || 0).toFixed(2)),
    recordsCount: curr.recordsCount || 0,
    previousPeriodComparison: {
      previousTotalKwh: Number((prev.previousTotalKwh || 0).toFixed(2)),
      previousTotalCostUsd: Number((prev.previousTotalCostUsd || 0).toFixed(2)),
      consumptionDeltaPct,
      costDeltaPct,
    },
    buildingWiseConsumption,
    departmentWiseConsumption,
    meterWiseConsumption,
    activeAlertsCount,
  };
}

/**
 * Time-series server-side aggregation supporting hourly, daily, weekly, and monthly buckets.
 */
export async function getTimeSeriesAggregation(
  params: AggregationFilterParams & {
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  }
) {
  const dateWindow = resolveDateWindow(params.startDate, params.endDate);
  const match = buildRecordMatchQuery(params, {
    start: dateWindow.start,
    end: dateWindow.end,
  });

  let dateFormat = '%Y-%m-%d';
  if (params.granularity === 'hourly') {
    dateFormat = '%Y-%m-%d %H:00';
  } else if (params.granularity === 'weekly') {
    dateFormat = '%Y-W%V';
  } else if (params.granularity === 'monthly') {
    dateFormat = '%Y-%m';
  }

  const series = await EnergyRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$timestamp' } },
        timestamp: { $min: '$timestamp' },
        kwh: { $sum: '$consumptionKwh' },
        cost: { $sum: '$estimatedCost' },
        carbonKg: { $sum: '$carbonKg' },
        peakKw: { $max: '$peakDemandKw' },
        avgKwh: { $avg: '$consumptionKwh' },
        anomalyCount: {
          $sum: { $cond: [{ $eq: ['$isAnomaly', true] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return series.map((item) => ({
    label: String(item._id),
    timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : String(item._id),
    kwh: Number((item.kwh || 0).toFixed(2)),
    cost: Number((item.cost || 0).toFixed(2)),
    carbonKg: Number((item.carbonKg || 0).toFixed(2)),
    peakKw: Number((item.peakKw || 0).toFixed(2)),
    avgKwh: Number((item.avgKwh || 0).toFixed(2)),
    anomalyCount: item.anomalyCount || 0,
  }));
}

/**
 * Returns Building Comparison, Department Comparison (allowing Department Managers
 * to benchmark their department against peer departments in the organization),
 * and Hour-of-Day profile analysis.
 */
export async function getEntityComparisons(params: AggregationFilterParams) {
  const dateWindow = resolveDateWindow(params.startDate, params.endDate);
  const orgId = toObjectId(params.user.organizationId);

  // For Department Comparison (Section 2: Department Manager can "Compare department consumption")
  const peerMatch = buildRecordMatchQuery(
    params,
    { start: dateWindow.start, end: dateWindow.end },
    true
  );

  const scopedMatch = buildRecordMatchQuery(params, {
    start: dateWindow.start,
    end: dateWindow.end,
  });

  const [buildingAgg, deptAgg, hourlyProfileAgg, buildings, departments] = await Promise.all([
    EnergyRecord.aggregate([
      { $match: peerMatch },
      {
        $group: {
          _id: '$buildingId',
          kwh: { $sum: '$consumptionKwh' },
          cost: { $sum: '$estimatedCost' },
          carbonKg: { $sum: '$carbonKg' },
          peakKw: { $max: '$peakDemandKw' },
        },
      },
      { $sort: { kwh: -1 } },
    ]),
    EnergyRecord.aggregate([
      { $match: peerMatch },
      {
        $group: {
          _id: '$departmentId',
          kwh: { $sum: '$consumptionKwh' },
          cost: { $sum: '$estimatedCost' },
          carbonKg: { $sum: '$carbonKg' },
          avgPowerFactor: { $avg: '$powerFactor' },
        },
      },
      { $sort: { kwh: -1 } },
    ]),
    EnergyRecord.aggregate([
      { $match: scopedMatch },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgKwh: { $avg: '$consumptionKwh' },
          totalKwh: { $sum: '$consumptionKwh' },
          totalCost: { $sum: '$estimatedCost' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Building.find({ organizationId: orgId })
      .select('name code areaSqFt baselineDailyKwh buildingType')
      .lean(),
    Department.find({ organizationId: orgId })
      .populate('buildingId', 'name code')
      .select('name code buildingId monthlyBudgetUsd headcount')
      .lean(),
  ]);

  const bldgMap = new Map(buildings.map((b) => [String(b._id), b]));
  const deptMap = new Map(departments.map((d) => [String(d._id), d]));

  const buildingComparison = buildingAgg.map((b) => {
    const info = bldgMap.get(String(b._id));
    return {
      buildingId: String(b._id),
      name: info?.name || 'Building',
      code: info?.code || 'BLD',
      buildingType: info?.buildingType || 'Office',
      kwh: Number((b.kwh || 0).toFixed(2)),
      cost: Number((b.cost || 0).toFixed(2)),
      carbonKg: Number((b.carbonKg || 0).toFixed(2)),
      peakKw: Number((b.peakKw || 0).toFixed(2)),
      intensityKwhPerSqFt:
        info?.areaSqFt && info.areaSqFt > 0
          ? Number(((b.kwh || 0) / info.areaSqFt).toFixed(3))
          : 0,
    };
  });

  const departmentComparison = deptAgg.map((d) => {
    const info = deptMap.get(String(d._id));
    const bldg = info?.buildingId as unknown as { name?: string } | undefined;
    const isAssignedToUser =
      params.user.role === 'org_admin' ||
      params.user.assignedDepartmentIds.length === 0 ||
      params.user.assignedDepartmentIds.includes(String(d._id));

    return {
      departmentId: String(d._id),
      name: info?.name || 'Department',
      code: info?.code || 'DEPT',
      buildingName: bldg?.name || 'Building',
      kwh: Number((d.kwh || 0).toFixed(2)),
      cost: Number((d.cost || 0).toFixed(2)),
      carbonKg: Number((d.carbonKg || 0).toFixed(2)),
      monthlyBudgetUsd: info?.monthlyBudgetUsd || 1500,
      kwhPerHeadcount:
        info?.headcount && info.headcount > 0
          ? Number(((d.kwh || 0) / info.headcount).toFixed(2))
          : 0,
      avgPowerFactor: Number((d.avgPowerFactor || 0.94).toFixed(2)),
      isAssignedToUser,
    };
  });

  const hourOfDayProfile = Array.from({ length: 24 }, (_, hour) => {
    const match = hourlyProfileAgg.find((h) => Number(h._id) === hour);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      avgKwh: Number((match?.avgKwh || 0).toFixed(2)),
      totalKwh: Number((match?.totalKwh || 0).toFixed(2)),
      totalCost: Number((match?.totalCost || 0).toFixed(2)),
      isPeakTariff: hour >= 14 && hour < 20,
    };
  });

  return {
    buildingComparison,
    departmentComparison,
    hourOfDayProfile,
  };
}
