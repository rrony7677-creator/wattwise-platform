import { Types } from 'mongoose';
import { EnergyRecord } from '../models/EnergyRecord.js';
import { toObjectId } from '../types/index.js';

export interface AnomalyEvaluationInput {
  organizationId: string | Types.ObjectId;
  meterId: string | Types.ObjectId;
  consumptionKwh: number;
  maxCapacityKw?: number;
}

export interface AnomalyEvaluationResult {
  isAnomaly: boolean;
  anomalyScore: number;
  baselineMean: number;
  baselineStdDev: number;
}

/**
 * Statistical Z-score & baseline spike anomaly detector.
 * Evaluates a new consumption reading against the meter's recent historical baseline.
 */
export async function evaluateMeterAnomaly(
  input: AnomalyEvaluationInput
): Promise<AnomalyEvaluationResult> {
  const recentRecords = await EnergyRecord.find({
    organizationId: toObjectId(input.organizationId),
    meterId: toObjectId(input.meterId),
  })
    .sort({ timestamp: -1 })
    .limit(40)
    .select('consumptionKwh')
    .lean();

  const values = recentRecords.map((r) => Number(r.consumptionKwh || 0)).filter((v) => v > 0);

  if (values.length < 5) {
    const capThreshold = (input.maxCapacityKw || 100) * 0.85;
    const isAnomaly = input.consumptionKwh > capThreshold;
    const score = isAnomaly
      ? Number(((input.consumptionKwh - capThreshold) / Math.max(1, capThreshold * 0.2)).toFixed(2))
      : 0;
    return {
      isAnomaly,
      anomalyScore: Math.max(0, score),
      baselineMean: capThreshold * 0.5,
      baselineStdDev: capThreshold * 0.15,
    };
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(1, values.length - 1);
  const stdDev = Math.sqrt(variance);

  const effectiveStdDev = Math.max(stdDev, mean * 0.12, 1);
  const zScore = (input.consumptionKwh - mean) / effectiveStdDev;

  const isAnomaly = zScore >= 2.2 && input.consumptionKwh > mean * 1.35;

  return {
    isAnomaly,
    anomalyScore: Number(Math.max(0, zScore).toFixed(2)),
    baselineMean: Number(mean.toFixed(2)),
    baselineStdDev: Number(effectiveStdDev.toFixed(2)),
  };
}
