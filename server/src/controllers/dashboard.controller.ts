import { Request, Response, NextFunction } from 'express';
import { getDashboardOverview } from '../services/aggregation.service.js';

export async function getOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const startDate =
      typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined;
    const endDate =
      typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined;
    const buildingId =
      typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : undefined;
    const departmentId =
      typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : undefined;

    const overview = await getDashboardOverview({
      user,
      startDate,
      endDate,
      buildingId,
      departmentId,
    });

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}
