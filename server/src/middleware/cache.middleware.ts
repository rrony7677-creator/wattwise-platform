import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  expiresAt: number;
  payload: unknown;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 500;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
  if (memoryCache.size > MAX_CACHE_ENTRIES) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(
      0,
      memoryCache.size - MAX_CACHE_ENTRIES
    );
    for (const k of keysToDelete) {
      memoryCache.delete(k);
    }
  }
}

/**
 * Serverless-compatible in-memory TTL cache middleware for Dashboard & Analytics endpoints.
 * Keys cache entries by Organization ID + User ID + Role + Full URL with query parameters.
 */
export function cacheMiddleware(ttlSeconds = 30) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET' || !req.user) {
      next();
      return;
    }

    const cacheKey = `org:${req.user.organizationId}:user:${req.user.userId}:role:${req.user.role}:url:${req.originalUrl}`;
    const now = Date.now();
    const existing = memoryCache.get(cacheKey);

    if (existing && existing.expiresAt > now) {
      res.setHeader('X-WattWise-Cache', 'HIT');
      res.setHeader('Cache-Control', `private, max-age=${ttlSeconds}`);
      const cachedPayload = existing.payload as Record<string, unknown>;
      if (cachedPayload && typeof cachedPayload === 'object' && cachedPayload.success) {
        res.status(200).json({
          ...cachedPayload,
          meta: {
            ...((cachedPayload.meta as Record<string, unknown>) || {}),
            cached: true,
          },
        });
        return;
      }
    }

    res.setHeader('X-WattWise-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body && typeof body === 'object') {
        cleanupExpiredEntries();
        memoryCache.set(cacheKey, {
          expiresAt: Date.now() + ttlSeconds * 1000,
          payload: body,
        });
      }
      return originalJson(body);
    }) as Response['json'];

    next();
  };
}

/**
 * Invalidates all cached dashboard/analytics entries for a specific organization
 * whenever new energy records, thresholds, meters, or alerts are mutated.
 */
export function invalidateOrgCache(organizationId: string): void {
  const prefix = `org:${organizationId}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
