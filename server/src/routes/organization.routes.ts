import { Router } from 'express';
import {
  getCurrentOrganization,
  updateCurrentOrganization,
  createOrganization,
} from '../controllers/organization.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/current', getCurrentOrganization);
router.patch('/current', requireRoles('org_admin'), updateCurrentOrganization);
router.post('/', requireRoles('org_admin'), createOrganization);

export default router;
