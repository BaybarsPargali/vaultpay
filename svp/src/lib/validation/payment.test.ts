/**
 * Tests for Payment Validation
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Payment schemas (matching what's in src/lib/validation/schemas.ts)
const PaymentStatus = z.enum(['pending', 'processing', 'completed', 'failed', 'rejected']);
const MPCStatus = z.enum(['pending', 'queued', 'processing', 'finalized', 'failed']);

const CreatePaymentSchema = z.object({
  orgId: z.string().uuid(),
  payeeId: z.string().uuid(),
  amount: z.number().positive(),
  token: z.string().default('SOL'),
});

const BatchPaymentSchema = z.object({
  orgId: z.string().uuid(),
  payments: z.array(z.object({
    payeeId: z.string().uuid(),
    amount: z.number().positive(),
  })).min(1).max(50),
  token: z.string().default('SOL'),
});

const SolanaAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address');

describe('Payment Status Validation', () => {
  it('accepts valid payment statuses', () => {
    expect(PaymentStatus.parse('pending')).toBe('pending');
    expect(PaymentStatus.parse('processing')).toBe('processing');
    expect(PaymentStatus.parse('completed')).toBe('completed');
    expect(PaymentStatus.parse('failed')).toBe('failed');
    expect(PaymentStatus.parse('rejected')).toBe('rejected');
  });

  it('rejects invalid payment status', () => {
    expect(() => PaymentStatus.parse('invalid')).toThrow();
    expect(() => PaymentStatus.parse('')).toThrow();
    expect(() => PaymentStatus.parse(null)).toThrow();
  });
});

describe('MPC Status Validation', () => {
  it('accepts valid MPC statuses', () => {
    expect(MPCStatus.parse('pending')).toBe('pending');
    expect(MPCStatus.parse('queued')).toBe('queued');
    expect(MPCStatus.parse('processing')).toBe('processing');
    expect(MPCStatus.parse('finalized')).toBe('finalized');
    expect(MPCStatus.parse('failed')).toBe('failed');
  });
});

describe('Create Payment Validation', () => {
  const validPayment = {
    orgId: '550e8400-e29b-41d4-a716-446655440000',
    payeeId: '550e8400-e29b-41d4-a716-446655440001',
    amount: 1.5,
    token: 'SOL',
  };

  it('accepts valid payment input', () => {
    const result = CreatePaymentSchema.parse(validPayment);
    expect(result.orgId).toBe(validPayment.orgId);
    expect(result.amount).toBe(1.5);
    expect(result.token).toBe('SOL');
  });

  it('uses default token if not provided', () => {
    const { token, ...noToken } = validPayment;
    const result = CreatePaymentSchema.parse(noToken);
    expect(result.token).toBe('SOL');
  });

  it('rejects invalid UUID for orgId', () => {
    const invalid = { ...validPayment, orgId: 'not-a-uuid' };
    expect(() => CreatePaymentSchema.parse(invalid)).toThrow();
  });

  it('rejects zero or negative amount', () => {
    expect(() => CreatePaymentSchema.parse({ ...validPayment, amount: 0 })).toThrow();
    expect(() => CreatePaymentSchema.parse({ ...validPayment, amount: -1 })).toThrow();
  });

  it('accepts very small positive amounts', () => {
    const result = CreatePaymentSchema.parse({ ...validPayment, amount: 0.000001 });
    expect(result.amount).toBe(0.000001);
  });

  it('accepts very large amounts', () => {
    const result = CreatePaymentSchema.parse({ ...validPayment, amount: 1000000000 });
    expect(result.amount).toBe(1000000000);
  });
});

describe('Batch Payment Validation', () => {
  const validBatch = {
    orgId: '550e8400-e29b-41d4-a716-446655440000',
    payments: [
      { payeeId: '550e8400-e29b-41d4-a716-446655440001', amount: 1.5 },
      { payeeId: '550e8400-e29b-41d4-a716-446655440002', amount: 2.5 },
    ],
    token: 'SOL',
  };

  it('accepts valid batch payment', () => {
    const result = BatchPaymentSchema.parse(validBatch);
    expect(result.payments.length).toBe(2);
  });

  it('rejects empty payments array', () => {
    const invalid = { ...validBatch, payments: [] };
    expect(() => BatchPaymentSchema.parse(invalid)).toThrow();
  });

  it('rejects more than 50 payments', () => {
    const tooMany = {
      ...validBatch,
      payments: Array(51).fill({
        payeeId: '550e8400-e29b-41d4-a716-446655440001',
        amount: 1,
      }),
    };
    expect(() => BatchPaymentSchema.parse(tooMany)).toThrow();
  });

  it('accepts exactly 50 payments', () => {
    const maxBatch = {
      ...validBatch,
      payments: Array(50).fill({
        payeeId: '550e8400-e29b-41d4-a716-446655440001',
        amount: 1,
      }),
    };
    const result = BatchPaymentSchema.parse(maxBatch);
    expect(result.payments.length).toBe(50);
  });
});

describe('Solana Address Validation', () => {
  it('accepts valid Solana addresses', () => {
    // Real mainnet addresses
    expect(SolanaAddressSchema.parse('11111111111111111111111111111111')).toBeDefined();
    expect(SolanaAddressSchema.parse('So11111111111111111111111111111111111111112')).toBeDefined();
    expect(SolanaAddressSchema.parse('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBeDefined();
  });

  it('rejects addresses with invalid characters', () => {
    // Contains 0, O, I, l which are not in base58
    expect(() => SolanaAddressSchema.parse('0OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')).toThrow();
    expect(() => SolanaAddressSchema.parse('IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII')).toThrow();
    expect(() => SolanaAddressSchema.parse('llllllllllllllllllllllllllllllll')).toThrow();
  });

  it('rejects addresses that are too short', () => {
    expect(() => SolanaAddressSchema.parse('ABC123')).toThrow();
    expect(() => SolanaAddressSchema.parse('1234567890123456789012345678901')).toThrow(); // 31 chars
  });

  it('rejects addresses that are too long', () => {
    expect(() => SolanaAddressSchema.parse('1'.repeat(45))).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => SolanaAddressSchema.parse('')).toThrow();
  });
});

describe('Amount Conversion', () => {
  it('converts SOL to lamports correctly', () => {
    const solToLamports = (sol: number): bigint => {
      return BigInt(Math.round(sol * 1_000_000_000));
    };

    expect(solToLamports(1)).toBe(BigInt(1_000_000_000));
    expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
    expect(solToLamports(0.000000001)).toBe(BigInt(1));
  });

  it('converts lamports to SOL correctly', () => {
    const lamportsToSol = (lamports: bigint): number => {
      return Number(lamports) / 1_000_000_000;
    };

    expect(lamportsToSol(BigInt(1_000_000_000))).toBe(1);
    expect(lamportsToSol(BigInt(500_000_000))).toBe(0.5);
    expect(lamportsToSol(BigInt(1))).toBe(0.000000001);
  });

  it('handles floating point precision', () => {
    const solToLamports = (sol: number): bigint => {
      return BigInt(Math.round(sol * 1_000_000_000));
    };

    // This would fail with simple multiplication due to floating point
    expect(solToLamports(0.1 + 0.2)).toBe(BigInt(300_000_000));
  });
});
