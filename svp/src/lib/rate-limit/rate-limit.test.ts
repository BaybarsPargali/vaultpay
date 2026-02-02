/**
 * Tests for Rate Limiting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  clearRateLimitStore,
  RATE_LIMITS,
  getClientIdentifier,
  rateLimitHeaders,
} from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
      const result = checkRateLimit('test-client', {
        maxRequests: 5,
        windowMs: 60000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('blocks requests exceeding limit', () => {
      const config = { maxRequests: 3, windowMs: 60000 };

      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit('test-client', config);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const blocked = checkRateLimit('test-client', config);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it('resets after window expires', async () => {
      const config = { maxRequests: 2, windowMs: 50 }; // 50ms window

      // Exhaust limit
      checkRateLimit('test-client', config);
      checkRateLimit('test-client', config);
      expect(checkRateLimit('test-client', config).allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should be allowed again
      const result = checkRateLimit('test-client', config);
      expect(result.allowed).toBe(true);
    });

    it('tracks different clients separately', () => {
      const config = { maxRequests: 1, windowMs: 60000 };

      // Client A uses their limit
      checkRateLimit('client-a', config);
      expect(checkRateLimit('client-a', config).allowed).toBe(false);

      // Client B should still be allowed
      expect(checkRateLimit('client-b', config).allowed).toBe(true);
    });

    it('uses prefix for namespacing', () => {
      const config1 = { maxRequests: 1, windowMs: 60000, prefix: 'api' };
      const config2 = { maxRequests: 1, windowMs: 60000, prefix: 'auth' };

      // Same client, different prefixes
      checkRateLimit('client', config1);
      expect(checkRateLimit('client', config1).allowed).toBe(false);
      expect(checkRateLimit('client', config2).allowed).toBe(true);
    });
  });

  describe('RATE_LIMITS', () => {
    it('has correct default configurations', () => {
      expect(RATE_LIMITS.api.maxRequests).toBe(100);
      expect(RATE_LIMITS.payments.maxRequests).toBe(20);
      expect(RATE_LIMITS.sensitive.maxRequests).toBe(10);
    });
  });

  describe('getClientIdentifier', () => {
    it('extracts wallet from header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-vaultpay-wallet': '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).toBe('wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
    });

    it('falls back to IP from x-forwarded-for', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).toBe('ip:192.168.1.1');
    });

    it('falls back to x-real-ip', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).toBe('ip:192.168.1.1');
    });

    it('returns unknown for local requests', () => {
      const request = new Request('http://localhost/api/test');

      const id = getClientIdentifier(request);
      expect(id).toBe('ip:unknown');
    });
  });

  describe('rateLimitHeaders', () => {
    it('generates correct headers', () => {
      const headers = rateLimitHeaders({
        remaining: 50,
        resetAt: Date.now() + 60000,
        retryAfter: 30,
      });

      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBe('30');
    });

    it('omits Retry-After when not rate limited', () => {
      const headers = rateLimitHeaders({
        remaining: 50,
        resetAt: Date.now() + 60000,
      });

      expect(headers['Retry-After']).toBeUndefined();
    });
  });
});
