import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import apiRouter from './routes/index.js';

export function createApp(): Express {
  const app = express();

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app')
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Root Status Endpoint for Vercel Backend Deployment Verification
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        name: 'WattWise Smart Energy Consumption Intelligence API',
        version: '1.0.0',
        status: 'online',
        apiBase: '/api/v1',
        healthEndpoint: '/api/v1/health',
      },
    });
  });

  // Health Check
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        service: 'wattwise-api',
        status: 'ok',
        serverless: Boolean(process.env.VERCEL),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Ensure MongoDB connection is active before handling any /api/v1 route (Vercel Serverless compatibility)
  app.use('/api/v1', async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      next(error);
    }
  });

  // Mount all 12 API route modules under /api/v1
  app.use('/api/v1', apiRouter);

  // Error handling fallbacks
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
