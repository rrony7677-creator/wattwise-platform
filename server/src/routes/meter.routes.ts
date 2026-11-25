import { Router } from 'express';
import {
  listMeters,
  getMeterHealthSummary,
  createMeter,
  updateMeter,
} from '../controllers/meter.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', listMeters);
router.get('/health-summary', getMeterHealthSummary);
router.post('/', requireRoles('org_admin', 'facility_manager'), createMeter);
router.patch('/:id', requireRoles('org_admin', 'facility_manager'), updateMeter);

export default router;
