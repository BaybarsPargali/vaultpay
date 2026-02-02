/**
 * Rate Limiter with In-Memory and Redis (Upstash) Support
 *
 * Uses in-memory store by default, but can use Redis for multi-instance deployments.
 * Redis mode requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 *
 * Usage:
 * - Set RATE_LIMIT_STORE=redis to use Upstash Redis (recommended for production)
 * - Default is 'memory' for development/single-instance
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  prefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'global',
};

// Check if Redis is configured
const RATE_LIMIT_STORE = process.env.RATE_LIMIT_STORE || 'memory';
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client if configured
let redis: Redis | null = null;
let redisRatelimit: Ratelimit | null = null;

if (RATE_LIMIT_STORE === 'redis' && UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
  
  redisRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    analytics: true,
    prefix: 'vaultpay',
  });
}

// In-memory store (resets on server restart)
const store = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        // Remove entries older than 10 minutes
        if (now - entry.windowStart > 10 * 60 * 1000) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );

  // Don't prevent process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Check rate limit for a given key (async for Redis support).
 * Returns { allowed: true, remaining, resetAt } or { allowed: false, retryAfter, resetAt }.
 */
export async function checkRateLimitAsync(
  key: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}> {
  const { maxRequests, windowMs, prefix } = { ...DEFAULT_CONFIG, ...config };
  const fullKey = `${prefix}:${key}`;
  
  // Use Redis if available
  if (redis && redisRatelimit) {
    const { success, remaining, reset } = await redisRatelimit.limit(fullKey);
    
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: reset,
        retryAfter: Math.max(1, retryAfter),
      };
    }
    
    return {
      allowed: true,
      remaining,
      resetAt: reset,
    };
  }
  
  // Fall back to in-memory
  return checkRateLimit(key, config);
}

/**
 * Check rate limit for a given key (sync, in-memory only).
 * Returns { allowed: true, remaining, resetAt } or { allowed: false, retryAfter, resetAt }.
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const { maxRequests, windowMs, prefix } = { ...DEFAULT_CONFIG, ...config };
  const fullKey = `${prefix}:${key}`;
  const now = Date.now();

  startCleanup();

  const entry = store.get(fullKey);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    store.set(fullKey, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Within existing window
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
      retryAfter,
    };
  }

  // Increment counter
  entry.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Rate limit configurations for different endpoints.
 */
export const RATE_LIMITS = {
  /** Standard API endpoints */
  api: { maxRequests: 100, windowMs: 60 * 1000, prefix: 'api' },

  /** Auth/wallet operations (more lenient) */
  auth: { maxRequests: 30, windowMs: 60 * 1000, prefix: 'auth' },

  /** Payment execution (strict) */
  payments: { maxRequests: 20, windowMs: 60 * 1000, prefix: 'payments' },

  /** Sensitive operations (very strict) */
  sensitive: { maxRequests: 10, windowMs: 60 * 1000, prefix: 'sensitive' },

  /** Confidential transfer operations */
  confidential: { maxRequests: 15, windowMs: 60 * 1000, prefix: 'ct' },
} as const;

/**
 * Get client identifier from request.
 * Uses X-Forwarded-For (Vercel/proxied) or falls back to IP.
 */
export function getClientIdentifier(request: Request): string {
  // Check for wallet auth header first (more specific)
  const walletHeader = request.headers.get('x-vaultpay-wallet');
  if (walletHeader) {
    return `wallet:${walletHeader}`;
  }

  // Fall back to IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take first IP in chain
    const ip = forwarded.split(',')[0].trim();
    return `ip:${ip}`;
  }

  // Vercel provides this
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback for local development
  return 'ip:unknown';
}

/**
 * Create rate limit headers for response.
 */
export function rateLimitHeaders(result: {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Apply rate limiting to a request (async for Redis support).
 * Returns null if allowed, or a Response if rate limited.
 */
export async function applyRateLimitAsync(
  request: Request,
  config: Partial<RateLimitConfig> = RATE_LIMITS.api
): Promise<Response | null> {
  const clientId = getClientIdentifier(request);
  const result = await checkRateLimitAsync(clientId, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitHeaders(result),
        },
      }
    );
  }

  return null;
}

/**
 * Apply rate limiting to a request (sync, in-memory only).
 * Returns null if allowed, or a Response if rate limited.
 */
export function applyRateLimit(
  request: Request,
  config: Partial<RateLimitConfig> = RATE_LIMITS.api
): Response | null {
  const clientId = getClientIdentifier(request);
  const result = checkRateLimit(clientId, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitHeaders(result),
        },
      }
    );
  }

  return null;
}

// For testing purposes
export function clearRateLimitStore(): void {
  store.clear();
}

/**
 * Check if Redis rate limiting is enabled
 */
export function isRedisRateLimitEnabled(): boolean {
  return redis !== null && redisRatelimit !== null;
}

/**
 * Get rate limit store type
 */
export function getRateLimitStoreType(): 'redis' | 'memory' {
  return redis !== null ? 'redis' : 'memory';
}
