/**
 * Tests for Zod Validation Schemas
 */

import { describe, it, expect } from 'vitest';
import {
  solanaPublicKeySchema,
  emailSchema,
  amountSchema,
  createOrganizationSchema,
  createPayeeSchema,
  createPaymentSchema,
  batchPaymentSchema,
  parseBody,
  formatZodErrors,
} from '@/lib/validation/schemas';

describe('Base Validators', () => {
  describe('solanaPublicKeySchema', () => {
    it('accepts valid Solana public keys', () => {
      const validKeys = [
        '11111111111111111111111111111111',
        'So11111111111111111111111111111111111111112',
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      ];

      for (const key of validKeys) {
        expect(solanaPublicKeySchema.safeParse(key).success).toBe(true);
      }
    });

    it('rejects invalid public keys', () => {
      const invalidKeys = [
        '', // Empty
        'short', // Too short
        '0OIl111111111111111111111111111111111111111', // Contains 0, O, I, l
        'not-a-valid-key-with-special-chars!@#',
      ];

      for (const key of invalidKeys) {
        expect(solanaPublicKeySchema.safeParse(key).success).toBe(false);
      }
    });
  });

  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      const validEmails = ['test@example.com', 'user.name@domain.org', 'a@b.co'];

      for (const email of validEmails) {
        expect(emailSchema.safeParse(email).success).toBe(true);
      }
    });

    it('rejects invalid emails', () => {
      const invalidEmails = ['', 'not-an-email', '@domain.com', 'user@', 'user@.com'];

      for (const email of invalidEmails) {
        expect(emailSchema.safeParse(email).success).toBe(false);
      }
    });
  });

  describe('amountSchema', () => {
    it('accepts valid amounts', () => {
      const validAmounts = ['1', '0.1', '100.123456789', '999999999'];

      for (const amount of validAmounts) {
        expect(amountSchema.safeParse(amount).success).toBe(true);
      }
    });

    it('rejects invalid amounts', () => {
      const invalidAmounts = [
        '', // Empty
        '0', // Zero not allowed
        '-1', // Negative
        '1.1234567890', // Too many decimals
        'abc', // Not a number
        '1,000', // Comma separator
      ];

      for (const amount of invalidAmounts) {
        expect(amountSchema.safeParse(amount).success).toBe(false);
      }
    });
  });
});

describe('Organization Schemas', () => {
  describe('createOrganizationSchema', () => {
    it('accepts valid organization data', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'Test DAO',
        adminWallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test DAO');
      }
    });

    it('rejects missing fields', () => {
      expect(createOrganizationSchema.safeParse({}).success).toBe(false);
      expect(createOrganizationSchema.safeParse({ name: 'Test' }).success).toBe(false);
    });

    it('rejects names over 100 characters', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'a'.repeat(101),
        adminWallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Payee Schemas', () => {
  describe('createPayeeSchema', () => {
    it('accepts valid payee data', () => {
      const result = createPayeeSchema.safeParse({
        orgId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        name: 'John Doe',
        email: 'john@example.com',
        walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid orgId format', () => {
      const result = createPayeeSchema.safeParse({
        orgId: 'not-a-cuid',
        name: 'John Doe',
        email: 'john@example.com',
        walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Payment Schemas', () => {
  describe('createPaymentSchema', () => {
    it('accepts valid payment data', () => {
      const result = createPaymentSchema.safeParse({
        orgId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        payeeId: 'clyyyyyyyyyyyyyyyyyyyyyyyyy',
        amount: '100.5',
      });

      expect(result.success).toBe(true);
    });

    it('accepts optional token', () => {
      const result = createPaymentSchema.safeParse({
        orgId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        payeeId: 'clyyyyyyyyyyyyyyyyyyyyyyyyy',
        amount: '100',
        token: 'USDC',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('batchPaymentSchema', () => {
    it('accepts valid batch payment', () => {
      const result = batchPaymentSchema.safeParse({
        orgId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        payments: [
          { payeeId: 'clyyyyyyyyyyyyyyyyyyyyyyyyy', amount: '100' },
          { payeeId: 'clzzzzzzzzzzzzzzzzzzzzzzzzz', amount: '200' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty payments array', () => {
      const result = batchPaymentSchema.safeParse({
        orgId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        payments: [],
      });

      expect(result.success).toBe(false);
    });

    it('rejects more than 50 payments', () => {
      const payments = Array.from({ length: 51 }, (_, i) => ({
        payeeId: `cl${'x'.repeat(24)}${i.toString().padStart(2, '0')}`,
        amount: '100',
      }));

      const result = batchPaymentSchema.safeParse({
        orgId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        payments,
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  describe('parseBody', () => {
    it('returns success with parsed data', () => {
      const result = parseBody(emailSchema, 'test@example.com');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('returns error for invalid input', () => {
      const result = parseBody(emailSchema, 'not-an-email');

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('formatZodErrors', () => {
    it('formats errors correctly', () => {
      const result = createPayeeSchema.safeParse({
        orgId: 'invalid',
        name: '',
        email: 'bad-email',
        walletAddress: 'short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(Array.isArray(formatted)).toBe(true);
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted[0]).toHaveProperty('field');
        expect(formatted[0]).toHaveProperty('message');
      }
    });
  });
});
