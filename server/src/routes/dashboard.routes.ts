import { Router } from 'express';
import { getOverview } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.use(authenticate);

// Cached for 30s per organization + user + query filter signature (Section 4: Dashboard Caching)
router.get('/overview', cacheMiddleware(30), getOverview);

export default router;
