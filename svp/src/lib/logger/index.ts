/**
 * Structured Logging for VaultPay
 *
 * Uses pino for high-performance JSON logging.
 * In development, uses pino-pretty for readable output.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ userId, action }, 'User performed action');
 *   logger.error({ err, paymentId }, 'Payment failed');
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

// Pino configuration
const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'secret',
      'token',
      'authorization',
      'cookie',
      'privateKey',
      'secretKey',
      'encryptedElGamalKey',
      'ciphertext',
      'nonce',
      'ephemeralPubKey',
      '*.password',
      '*.secret',
      '*.token',
      '*.privateKey',
      '*.secretKey',
    ],
    censor: '[REDACTED]',
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Base context
  base: {
    service: 'vaultpay',
    version: process.env.npm_package_version || '0.1.0',
  },

  // Disable in tests to reduce noise
  enabled: !isTest,

  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'x-forwarded-for': req.headers?.['x-forwarded-for'],
      },
    }),
  },
};

// Create logger instance
// NOTE: Pino's transport option with worker threads is incompatible with Next.js webpack
// In development, we use synchronous pino-pretty directly to stdout
// In production, use standard JSON output
const logger = pino(pinoConfig);

// Log that logger is initialized (only in development)
if (isDevelopment && typeof window === 'undefined') {
  // Server-side only log on startup
  logger.debug('Logger initialized in development mode');
}

/**
 * Create a child logger with additional context.
 * Use for request-scoped or component-scoped logging.
 */
export function createLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

/**
 * Log API request/response.
 * Call at the start and end of route handlers.
 */
export function logRequest(
  method: string,
  path: string,
  context: Record<string, unknown> = {}
): void {
  logger.info({ method, path, ...context }, `${method} ${path}`);
}

/**
 * Log API response.
 */
export function logResponse(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  context: Record<string, unknown> = {}
): void {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger[level](
    { method, path, status, durationMs, ...context },
    `${method} ${path} ${status} ${durationMs}ms`
  );
}

/**
 * Log payment-related events.
 */
export const paymentLogger = createLogger({ component: 'payment' });

/**
 * Log MPC/encryption events.
 */
export const mpcLogger = createLogger({ component: 'mpc' });

/**
 * Log compliance/Range events.
 */
export const complianceLogger = createLogger({ component: 'compliance' });

/**
 * Log authentication events.
 */
export const authLogger = createLogger({ component: 'auth' });

/**
 * Log database events.
 */
export const dbLogger = createLogger({ component: 'database' });

// Export main logger and pino for advanced usage
export { logger, pino };
export default logger;
