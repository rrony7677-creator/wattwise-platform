import { Router } from 'express';
import {
  generateReportData,
  exportReportCsv,
  listScheduledReports,
  createScheduledReport,
  runScheduledReportNow,
  deleteScheduledReport,
} from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/generate', generateReportData);
router.get('/export-csv', exportReportCsv);
router.get('/scheduled', listScheduledReports);
router.post(
  '/scheduled',
  requireRoles('org_admin', 'facility_manager', 'department_manager'),
  createScheduledReport
);
router.post(
  '/scheduled/:id/run-now',
  requireRoles('org_admin', 'facility_manager', 'department_manager'),
  runScheduledReportNow
);
router.delete(
  '/scheduled/:id',
  requireRoles('org_admin', 'facility_manager', 'department_manager'),
  deleteScheduledReport
);

export default router;
