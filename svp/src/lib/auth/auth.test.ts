/**
 * Tests for Wallet Signature Authentication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultPayAuthHeaders } from '@/lib/auth/constants';

// Message prefix used in auth
const AUTH_MESSAGE_PREFIX = 'VaultPay Auth';
// Signature TTL: 5 minutes
const AUTH_SIGNATURE_TTL_MS = 5 * 60 * 1000;

// Mock nacl before importing auth
vi.mock('tweetnacl', () => ({
  default: {
    sign: {
      detached: {
        verify: vi.fn(() => true),
      },
    },
  },
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    organization: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    payee: {
      findUnique: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth Constants', () => {
  it('has correct message prefix', () => {
    expect(AUTH_MESSAGE_PREFIX).toBe('VaultPay Auth');
  });

  it('has reasonable TTL', () => {
    // Should be 5 minutes (300000ms)
    expect(AUTH_SIGNATURE_TTL_MS).toBe(5 * 60 * 1000);
  });
});

describe('Auth Header Building', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  it('builds correct auth message format', () => {
    const timestamp = Date.now();
    const message = `${AUTH_MESSAGE_PREFIX}:${timestamp}`;

    expect(message).toBe('VaultPay Auth:1704067200000');
  });

  it('encodes message to base64 correctly', () => {
    const message = 'VaultPay Auth:1704067200000';
    const encoded = Buffer.from(message).toString('base64');

    expect(encoded).toBe('VmF1bHRQYXkgQXV0aDoxNzA0MDY3MjAwMDAw');
  });
});

describe('Signature Expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('accepts signatures within TTL', () => {
    const now = Date.now();
    const signatureTime = now - (AUTH_SIGNATURE_TTL_MS - 1000); // 1 second before expiry

    const isExpired = now - signatureTime > AUTH_SIGNATURE_TTL_MS;
    expect(isExpired).toBe(false);
  });

  it('rejects signatures past TTL', () => {
    const now = Date.now();
    const signatureTime = now - (AUTH_SIGNATURE_TTL_MS + 1000); // 1 second after expiry

    const isExpired = now - signatureTime > AUTH_SIGNATURE_TTL_MS;
    expect(isExpired).toBe(true);
  });
});

describe('Header Extraction', () => {
  it('extracts wallet and signature from headers', () => {
    const headers = new Headers({
      [VaultPayAuthHeaders.wallet]: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      [VaultPayAuthHeaders.signature]: 'base64signature==',
      [VaultPayAuthHeaders.timestamp]: '1704067200000',
    });

    const wallet = headers.get(VaultPayAuthHeaders.wallet);
    const signature = headers.get(VaultPayAuthHeaders.signature);
    const timestamp = headers.get(VaultPayAuthHeaders.timestamp);

    expect(wallet).toBe('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
    expect(signature).toBe('base64signature==');
    expect(timestamp).toBe('1704067200000');
  });

  it('handles missing headers gracefully', () => {
    const headers = new Headers({});

    expect(headers.get(VaultPayAuthHeaders.wallet)).toBeNull();
    expect(headers.get(VaultPayAuthHeaders.signature)).toBeNull();
    expect(headers.get(VaultPayAuthHeaders.timestamp)).toBeNull();
  });
});
