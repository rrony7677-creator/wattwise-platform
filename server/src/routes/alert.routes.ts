import { Router } from 'express';
import {
  listAlerts,
  updateAlertStatus,
  listThresholds,
  createThreshold,
  updateThreshold,
  deleteThreshold,
} from '../controllers/alert.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// Threshold configuration endpoints
router.get('/thresholds', listThresholds);
router.post('/thresholds', requireRoles('org_admin', 'facility_manager'), createThreshold);
router.patch('/thresholds/:id', requireRoles('org_admin', 'facility_manager'), updateThreshold);
router.delete('/thresholds/:id', requireRoles('org_admin', 'facility_manager'), deleteThreshold);

// Alert history & status lifecycle endpoints
router.get('/', listAlerts);
router.patch('/:id/status', requireRoles('org_admin', 'facility_manager'), updateAlertStatus);

export default router;
