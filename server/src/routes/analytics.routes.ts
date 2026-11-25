import { Router } from 'express';
import {
  getTimeSeries,
  getComparisons,
  getInsights,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/time-series', cacheMiddleware(30), getTimeSeries);
router.get('/comparisons', cacheMiddleware(30), getComparisons);
router.get('/insights', cacheMiddleware(30), getInsights);

export default router;
