import { EnergyRecord } from '../models/EnergyRecord.js';
import { Organization } from '../models/Organization.js';
import { buildScopedFilter } from '../middleware/rbac.middleware.js';
import { AuthUserContext, toObjectId } from '../types/index.js';

export interface ForecastPointOutput {
  date: string;
  label: string;
  actualKwh?: number;
  forecastKwh: number;
  lowerBoundKwh: number;
  upperBoundKwh: number;
  estimatedCost: number;
  isForecast: boolean;
}

/**
 * Bonus Challenge: Energy Consumption Forecasting
 * Uses 30-day historical daily consumption series to fit a linear regression trend
 * combined with Day-of-Week seasonality multipliers and 95% confidence bounds.
 */
export async function generateConsumptionForecast(params: {
  user: AuthUserContext;
  buildingId?: string;
  departmentId?: string;
  horizonDays?: number;
}): Promise<ForecastPointOutput[]> {
  const { user, buildingId, departmentId, horizonDays = 7 } = params;
  const orgId = toObjectId(user.organizationId);

  const thirtyDaysAgo = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
  const filter = buildScopedFilter(user, {
    includeBuildingScope: true,
    includeDepartmentScope: true,
    includeMeterScope: true,
  });

  filter.timestamp = { $gte: thirtyDaysAgo };
  if (buildingId) filter.buildingId = toObjectId(buildingId);
  if (departmentId) filter.departmentId = toObjectId(departmentId);

  const [dailyHistory, organization] = await Promise.all([
    EnergyRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          dailyKwh: { $sum: '$consumptionKwh' },
          dailyCost: { $sum: '$estimatedCost' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Organization.findById(orgId).select('baseTariffPerKwh peakTariffPerKwh').lean(),
  ]);

  if (dailyHistory.length === 0) {
    return [];
  }

  const blendedTariff = organization
    ? organization.baseTariffPerKwh * 0.72 + organization.peakTariffPerKwh * 0.28
    : 0.16;

  // Prepare indexed series
  const n = dailyHistory.length;
  const points = dailyHistory.map((item, idx) => {
    const dt = new Date(`${item._id}T00:00:00Z`);
    return {
      x: idx,
      dateStr: String(item._id),
      dayOfWeek: dt.getUTCDay(),
      y: Number(item.dailyKwh || 0),
    };
  });

  const meanX = points.reduce((acc, p) => acc + p.x, 0) / n;
  const meanY = points.reduce((acc, p) => acc + p.y, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += Math.pow(p.x - meanX, 2);
  }

  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  // Compute day-of-week seasonal indices (0 = Sunday .. 6 = Saturday)
  const dowTotals = Array(7).fill(0);
  const dowCounts = Array(7).fill(0);
  for (const p of points) {
    const trendVal = Math.max(1, intercept + slope * p.x);
    dowTotals[p.dayOfWeek] += p.y / trendVal;
    dowCounts[p.dayOfWeek] += 1;
  }

  const seasonalFactor = dowTotals.map((tot, dow) =>
    dowCounts[dow] > 0 ? Math.min(1.35, Math.max(0.55, tot / dowCounts[dow])) : 1
  );

  // Compute residual standard deviation
  let residualSqSum = 0;
  for (const p of points) {
    const fitted = (intercept + slope * p.x) * seasonalFactor[p.dayOfWeek];
    residualSqSum += Math.pow(p.y - fitted, 2);
  }
  const residualStdDev = Math.max(
    meanY * 0.08,
    Math.sqrt(residualSqSum / Math.max(1, n - 2))
  );

  const output: ForecastPointOutput[] = [];

  // Include last 14 historical days for smooth Actual -> Forecast visual transition
  const recentActuals = points.slice(-14);
  for (const p of recentActuals) {
    const fitted = Math.max(0, (intercept + slope * p.x) * seasonalFactor[p.dayOfWeek]);
    const dt = new Date(`${p.dateStr}T00:00:00Z`);
    const label = dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

    output.push({
      date: p.dateStr,
      label,
      actualKwh: Number(p.y.toFixed(2)),
      forecastKwh: Number(fitted.toFixed(2)),
      lowerBoundKwh: Number(Math.max(0, fitted - 1.28 * residualStdDev).toFixed(2)),
      upperBoundKwh: Number((fitted + 1.28 * residualStdDev).toFixed(2)),
      estimatedCost: Number((p.y * blendedTariff).toFixed(2)),
      isForecast: false,
    });
  }

  // Project next `horizonDays` into the future
  const lastDate = new Date(`${points[points.length - 1].dateStr}T00:00:00Z`);
  for (let h = 1; h <= horizonDays; h++) {
    const futureDate = new Date(lastDate.getTime() + h * 24 * 60 * 60 * 1000);
    const futureDateStr = futureDate.toISOString().slice(0, 10);
    const dow = futureDate.getUTCDay();
    const futureX = n - 1 + h;

    const rawTrend = Math.max(meanY * 0.4, intercept + slope * futureX);
    const projectedKwh = Math.max(0, rawTrend * seasonalFactor[dow]);
    const margin = 1.65 * residualStdDev * (1 + h * 0.04);

    output.push({
      date: futureDateStr,
      label: futureDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      forecastKwh: Number(projectedKwh.toFixed(2)),
      lowerBoundKwh: Number(Math.max(0, projectedKwh - margin).toFixed(2)),
      upperBoundKwh: Number((projectedKwh + margin).toFixed(2)),
      estimatedCost: Number((projectedKwh * blendedTariff).toFixed(2)),
      isForecast: true,
    });
  }

  return output;
}
