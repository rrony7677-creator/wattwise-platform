export interface CostCarbonInput {
  consumptionKwh: number;
  timestamp: Date | string;
  baseTariffPerKwh: number;
  peakTariffPerKwh: number;
  carbonFactorKgPerKwh: number;
}

export interface CostCarbonResult {
  estimatedCost: number;
  carbonKg: number;
  appliedTariff: number;
  isPeakHour: boolean;
}

/**
 * Performs consistent electricity cost ($) and carbon emission (kg CO2e) calculations.
 * Peak window: 14:00 to 20:00 (hours 14, 15, 16, 17, 18, 19).
 */
export function calculateCostAndCarbon(input: CostCarbonInput): CostCarbonResult {
  const kwh = Math.max(0, Number(input.consumptionKwh) || 0);
  const date = typeof input.timestamp === 'string' ? new Date(input.timestamp) : input.timestamp;
  const hour = date.getUTCHours();

  const isPeakHour = hour >= 14 && hour < 20;
  const appliedTariff = isPeakHour
    ? Number(input.peakTariffPerKwh || 0.22)
    : Number(input.baseTariffPerKwh || 0.14);

  const carbonFactor = Number(input.carbonFactorKgPerKwh || 0.42);

  const estimatedCost = Number((kwh * appliedTariff).toFixed(4));
  const carbonKg = Number((kwh * carbonFactor).toFixed(4));

  return {
    estimatedCost,
    carbonKg,
    appliedTariff,
    isPeakHour,
  };
}
