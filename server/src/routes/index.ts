import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import organizationRoutes from './organization.routes.js';
import buildingRoutes from './building.routes.js';
import floorRoutes from './floor.routes.js';
import departmentRoutes from './department.routes.js';
import meterRoutes from './meter.routes.js';
import energyRecordRoutes from './energyRecord.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import analyticsRoutes from './analytics.routes.js';
import alertRoutes from './alert.routes.js';
import reportRoutes from './report.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/organizations', organizationRoutes);
apiRouter.use('/buildings', buildingRoutes);
apiRouter.use('/floors', floorRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/meters', meterRoutes);
apiRouter.use('/energy-records', energyRecordRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/alerts', alertRoutes);
apiRouter.use('/reports', reportRoutes);

export default apiRouter;
