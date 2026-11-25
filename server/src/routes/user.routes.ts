import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  updateMyProfile,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// Self-service profile update for all authenticated roles
router.patch('/profile/me', updateMyProfile);

// Organization Admin user management routes
router.get('/', requireRoles('org_admin'), listUsers);
router.post('/', requireRoles('org_admin'), createUser);
router.patch('/:id', requireRoles('org_admin'), updateUser);

export default router;
