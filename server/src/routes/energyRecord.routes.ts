import { Router } from 'express';
import {
  listEnergyRecords,
  createEnergyRecord,
  triggerSimulationTick,
} from '../controllers/energyRecord.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// Note: Historical energy records are strictly preserved (no DELETE endpoint per Section 5)
router.get('/', listEnergyRecords);
router.post('/', requireRoles('org_admin', 'facility_manager'), createEnergyRecord);
router.post('/simulate-tick', requireRoles('org_admin', 'facility_manager'), triggerSimulationTick);

export default router;
