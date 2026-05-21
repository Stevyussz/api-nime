import type { Request, Response, NextFunction } from "express";
import { LRUCache } from "lru-cache";
import path from "path";

// 12 jam default TTL
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12;

// 500 entries: cukup untuk 4 provider × banyak route × pagination
const lruCache = new LRUCache<string, object>({
  max: 500,
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
  ttl: DEFAULT_TTL_MS,
});

/**
 * Server-side LRU cache middleware.
 * @param ttl - cache lifetime dalam menit (default 720 = 12 jam)
 */
export function serverCache(ttl?: number) {
  const newTTL = ttl != null ? 1000 * 60 * ttl : DEFAULT_TTL_MS;

  return (req: Request, res: Response, next: NextFunction) => {
    // Normalize key: konsisten trailing slash, ignore Windows backslash
    const key = path.join(req.originalUrl, "/").replace(/\\/g, "/");
    const cached = lruCache.get(key);

    if (cached !== undefined) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    res.setHeader("X-Cache", "MISS");

    // Intercept res.json untuk menyimpan ke cache
    const originalJson = res.json.bind(res);
    res.json = (body: IPayload) => {
      // Hanya cache respons sukses
      if (res.statusCode >= 200 && res.statusCode < 400) {
        lruCache.set(key, body as object, { ttl: newTTL });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Client-side Cache-Control header middleware.
 * @param maxAge - durasi cache client dalam menit (default 1)
 */
export function clientCache(maxAge?: number) {
  const maxAgeSecs = (maxAge ?? 1) * 60;
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAgeSecs}`);
    next();
  };
}

/** Utility: manual invalidate cache (misal saat data update) */
export function invalidateCache(urlPath: string): boolean {
  const key = path.join(urlPath, "/").replace(/\\/g, "/");
  return lruCache.delete(key);
}

/** Utility: get cache stats untuk debugging */
export function getCacheStats() {
  return {
    size: lruCache.size,
    max: lruCache.max,
    calculatedSize: lruCache.calculatedSize,
  };
}
