import { Router } from 'express';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', listDepartments);
router.post('/', requireRoles('org_admin'), createDepartment);
router.patch('/:id', requireRoles('org_admin'), updateDepartment);
router.delete('/:id', requireRoles('org_admin'), deleteDepartment);

export default router;
