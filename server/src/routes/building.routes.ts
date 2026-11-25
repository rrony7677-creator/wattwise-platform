import { Router } from 'express';
import {
  listBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from '../controllers/building.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', listBuildings);
router.get('/:id', getBuildingById);
router.post('/', requireRoles('org_admin'), createBuilding);
router.patch('/:id', requireRoles('org_admin'), updateBuilding);
router.delete('/:id', requireRoles('org_admin'), deleteBuilding);

export default router;
