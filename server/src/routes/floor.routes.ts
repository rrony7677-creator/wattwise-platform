import { Router } from 'express';
import {
  listFloors,
  createFloor,
  updateFloor,
  deleteFloor,
} from '../controllers/floor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', listFloors);
router.post('/', requireRoles('org_admin'), createFloor);
router.patch('/:id', requireRoles('org_admin'), updateFloor);
router.delete('/:id', requireRoles('org_admin'), deleteFloor);

export default router;
