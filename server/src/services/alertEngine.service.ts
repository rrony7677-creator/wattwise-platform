import { IEnergyRecord } from '../models/EnergyRecord.js';
import { IMeter } from '../models/Meter.js';
import { Threshold } from '../models/Threshold.js';
import { Alert, IAlert } from '../models/Alert.js';

export interface AlertEvaluationContext {
  record: IEnergyRecord;
  meter: IMeter;
  baselineMean?: number;
}

/**
 * Evaluates configured building/department/meter Thresholds, Anomaly flags,
 * and Meter Health scores when an energy record is ingested, automatically
 * generating Alert documents with status 'New'.
 */
export async function evaluateAndTriggerAlerts(
  ctx: AlertEvaluationContext
): Promise<IAlert[]> {
  const { record, meter, baselineMean } = ctx;
  const createdAlerts: IAlert[] = [];

  // 1. Evaluate active configured thresholds matching meter, department, or building
  const thresholds = await Threshold.find({
    organizationId: record.organizationId,
    isActive: true,
    $or: [
      { scopeType: 'meter', meterId: record.meterId },
      { scopeType: 'department', departmentId: record.departmentId },
      { scopeType: 'building', buildingId: record.buildingId },
    ],
  }).lean();

  for (const threshold of thresholds) {
    let metricValue = record.consumptionKwh;
    let unitLabel = 'kWh';

    if (threshold.metric === 'cost_usd') {
      metricValue = record.estimatedCost;
      unitLabel = 'USD';
    } else if (threshold.metric === 'unusual_spike_pct') {
      const base = baselineMean && baselineMean > 0 ? baselineMean : meter.maxCapacityKw * 0.4;
      metricValue = base > 0 ? ((record.consumptionKwh - base) / base) * 100 : 0;
      unitLabel = '% above baseline';
    }

    if (metricValue >= threshold.criticalLimit || metricValue >= threshold.warningLimit) {
      const isCritical = metricValue >= threshold.criticalLimit;
      const limitBreached = isCritical ? threshold.criticalLimit : threshold.warningLimit;

      const alertDoc = await Alert.create({
        organizationId: record.organizationId,
        buildingId: record.buildingId,
        floorId: record.floorId,
        departmentId: record.departmentId,
        meterId: record.meterId,
        thresholdId: threshold._id,
        energyRecordId: record._id,
        type:
          threshold.metric === 'unusual_spike_pct'
            ? 'unusual_consumption'
            : threshold.metric === 'cost_usd'
            ? 'budget_warning'
            : 'high_usage',
        severity: isCritical ? 'critical' : 'warning',
        status: 'New',
        title: `${isCritical ? 'Critical' : 'Warning'} Threshold Breach: ${threshold.name}`,
        message: `Meter ${meter.meterCode} (${meter.name}) recorded ${metricValue.toFixed(
          2
        )} ${unitLabel}, exceeding the ${threshold.period} ${
          isCritical ? 'critical' : 'warning'
        } threshold of ${limitBreached} ${unitLabel}.`,
        actualValue: Number(metricValue.toFixed(2)),
        thresholdValue: limitBreached,
        timestamp: record.timestamp,
      });

      createdAlerts.push(alertDoc.toObject());
    }
  }

  // 2. If flagged as an anomaly and no unusual_consumption alert was already created for this record
  if (
    record.isAnomaly &&
    !createdAlerts.some((a) => a.type === 'unusual_consumption')
  ) {
    const expectedVal =
      baselineMean && baselineMean > 0
        ? Number((baselineMean * 1.35).toFixed(2))
        : Number((record.consumptionKwh * 0.65).toFixed(2));

    const anomalyAlert = await Alert.create({
      organizationId: record.organizationId,
      buildingId: record.buildingId,
      floorId: record.floorId,
      departmentId: record.departmentId,
      meterId: record.meterId,
      energyRecordId: record._id,
      type: 'unusual_consumption',
      severity: record.anomalyScore >= 3.0 ? 'critical' : 'warning',
      status: 'New',
      title: `Unusual Consumption Pattern on ${meter.meterCode}`,
      message: `Statistical anomaly detected (Z-score: ${record.anomalyScore.toFixed(
        2
      )}σ). Consumption of ${record.consumptionKwh.toFixed(
        2
      )} kWh significantly exceeds expected profile (${expectedVal} kWh).`,
      actualValue: Number(record.consumptionKwh.toFixed(2)),
      thresholdValue: expectedVal,
      timestamp: record.timestamp,
    });

    createdAlerts.push(anomalyAlert.toObject());
  }

  // 3. Check meter health degradation
  if (meter.healthScore < 80 || meter.status === 'warning' || meter.status === 'offline') {
    const existingOpenHealthAlert = await Alert.findOne({
      organizationId: record.organizationId,
      meterId: meter._id,
      type: 'meter_health',
      status: 'New',
    }).lean();

    if (!existingOpenHealthAlert) {
      const healthAlert = await Alert.create({
        organizationId: record.organizationId,
        buildingId: record.buildingId,
        floorId: record.floorId,
        departmentId: record.departmentId,
        meterId: record.meterId,
        type: 'meter_health',
        severity: meter.healthScore < 70 || meter.status === 'offline' ? 'critical' : 'warning',
        status: 'New',
        title: `Meter Health Alert: ${meter.meterCode} (${meter.healthScore}%)`,
        message: `Smart meter ${meter.meterCode} reported degraded health score of ${meter.healthScore}% (Status: ${meter.status}). Inspection recommended.`,
        actualValue: meter.healthScore,
        thresholdValue: 85,
        timestamp: new Date(),
      });
      createdAlerts.push(healthAlert.toObject());
    }
  }

  return createdAlerts;
}
