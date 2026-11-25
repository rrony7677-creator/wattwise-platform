import { Request, Response, NextFunction } from 'express';
import {
  getTimeSeriesAggregation,
  getEntityComparisons,
} from '../services/aggregation.service.js';
import { getEnergyIntelligenceInsights } from '../services/insights.service.js';

function extractCommonParams(req: Request) {
  return {
    user: req.user!,
    startDate:
      typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined,
    buildingId:
      typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : undefined,
    floorId: typeof req.query.floorId === 'string' ? req.query.floorId.trim() : undefined,
    departmentId:
      typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : undefined,
    meterId: typeof req.query.meterId === 'string' ? req.query.meterId.trim() : undefined,
  };
}

export async function getTimeSeries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawGranularity =
      typeof req.query.granularity === 'string' ? req.query.granularity.trim() : 'daily';
    const granularity = ['hourly', 'daily', 'weekly', 'monthly'].includes(rawGranularity)
      ? (rawGranularity as 'hourly' | 'daily' | 'weekly' | 'monthly')
      : 'daily';

    const series = await getTimeSeriesAggregation({
      ...extractCommonParams(req),
      granularity,
    });

    res.status(200).json({
      success: true,
      data: series,
    });
  } catch (error) {
    next(error);
  }
}

export async function getComparisons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const comparisons = await getEntityComparisons(extractCommonParams(req));

    res.status(200).json({
      success: true,
      data: comparisons,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInsights(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const insights = await getEnergyIntelligenceInsights(extractCommonParams(req));

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
}
