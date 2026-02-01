/**
 * Zod Validation Schemas for VaultPay API
 *
 * Centralized input validation for all API endpoints.
 * Use these schemas in route handlers for consistent, type-safe validation.
 */

import { z } from 'zod';

// ============================================================================
// Base Validators
// ============================================================================

/** Solana public key format (base58, 32-44 chars) */
export const solanaPublicKeySchema = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana public key format');

/** Email address */
export const emailSchema = z.string().email('Invalid email address');

/** Positive decimal amount (string for precision) */
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,9})?$/, 'Amount must be a positive number with up to 9 decimal places')
  .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0');

/** Non-empty trimmed string */
export const nonEmptyStringSchema = z.string().min(1).trim();

/** CUID format ID */
export const cuidSchema = z.string().cuid();

// ============================================================================
// Organization Schemas
// ============================================================================

export const createOrganizationSchema = z.object({
  name: nonEmptyStringSchema.max(100, 'Organization name must be 100 characters or less'),
  adminWallet: solanaPublicKeySchema,
});

export const updateOrganizationSchema = z.object({
  name: nonEmptyStringSchema.max(100).optional(),
  // Treasury fields
  treasuryMint: solanaPublicKeySchema.optional(),
  treasuryAccount: solanaPublicKeySchema.optional(),
  // Multisig fields
  multisigAddress: solanaPublicKeySchema.optional(),
  multisigThreshold: z.number().int().min(1).max(10).optional(),
});

// ============================================================================
// Payee Schemas
// ============================================================================

export const rangeStatusSchema = z.enum(['pending', 'approved', 'flagged', 'rejected']);

export const createPayeeSchema = z.object({
  orgId: cuidSchema,
  name: nonEmptyStringSchema.max(100, 'Name must be 100 characters or less'),
  email: emailSchema,
  walletAddress: solanaPublicKeySchema,
});

export const updatePayeeSchema = z.object({
  name: nonEmptyStringSchema.max(100).optional(),
  email: emailSchema.optional(),
  walletAddress: solanaPublicKeySchema.optional(),
});

// ============================================================================
// Payment Schemas
// ============================================================================

export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected',
]);

export const mpcStatusSchema = z.enum([
  'pending',
  'queued',
  'processing',
  'finalized',
  'failed',
]);

export const tokenSchema = z.enum(['SOL', 'USDC', 'VPAY']).default('SOL');

export const createPaymentSchema = z.object({
  orgId: cuidSchema,
  payeeId: cuidSchema,
  amount: amountSchema,
  token: tokenSchema.optional(),
});

export const batchPaymentSchema = z.object({
  orgId: cuidSchema,
  payments: z
    .array(
      z.object({
        payeeId: cuidSchema,
        amount: amountSchema,
        token: tokenSchema.optional(),
      })
    )
    .min(1, 'At least one payment is required')
    .max(50, 'Maximum 50 payments per batch'),
  execute: z.boolean().optional().default(false),
});

export const executePaymentSchema = z.object({
  paymentId: cuidSchema,
  senderPublicKey: solanaPublicKeySchema,
});

// ============================================================================
// Confidential Transfer Schemas
// ============================================================================

export const confidentialOperationSchema = z.enum([
  'generate-keypair',
  'configure-account',
  'get-balance',
  'mint-faucet',
  'deposit',
  'prepare-transfer',
]);

export const confidentialTransferSchema = z.object({
  operation: confidentialOperationSchema,
  walletAddress: solanaPublicKeySchema.optional(),
  amount: amountSchema.optional(),
  recipientAddress: solanaPublicKeySchema.optional(),
});

// ============================================================================
// Recurring Payment Schemas
// ============================================================================

export const scheduleTypeSchema = z.enum(['weekly', 'biweekly', 'monthly', 'custom']);

export const createRecurringTemplateSchema = z.object({
  orgId: cuidSchema,
  payeeId: cuidSchema,
  amount: amountSchema,
  token: tokenSchema.optional(),
  schedule: scheduleTypeSchema,
  cronExpression: z.string().optional(), // Required for 'custom' schedule
});

export const updateRecurringTemplateSchema = z.object({
  amount: amountSchema.optional(),
  schedule: scheduleTypeSchema.optional(),
  cronExpression: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Treasury Schemas
// ============================================================================

export const createTreasurySchema = z.object({
  orgId: cuidSchema,
  decimals: z.number().int().min(0).max(18).default(9),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orgIdQuerySchema = z.object({
  orgId: cuidSchema,
});

export const walletQuerySchema = z.object({
  wallet: solanaPublicKeySchema,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse and validate request body with a schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function parseBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Parse URL search params with a schema.
 */
export function parseQueryParams<T extends z.ZodSchema>(
  schema: T,
  searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return parseBody(schema, obj);
}

/**
 * Format Zod errors for API response.
 */
export function formatZodErrors(error: z.ZodError): { field: string; message: string }[] {
  return error.errors.map((e) => ({
    field: e.path.join('.') || 'root',
    message: e.message,
  }));
}

// ============================================================================
// Type Exports
// ============================================================================

export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;
export type CreatePayee = z.infer<typeof createPayeeSchema>;
export type UpdatePayee = z.infer<typeof updatePayeeSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
export type BatchPayment = z.infer<typeof batchPaymentSchema>;
export type ExecutePayment = z.infer<typeof executePaymentSchema>;
export type CreateRecurringTemplate = z.infer<typeof createRecurringTemplateSchema>;
export type UpdateRecurringTemplate = z.infer<typeof updateRecurringTemplateSchema>;
export type CreateTreasury = z.infer<typeof createTreasurySchema>;
export type Pagination = z.infer<typeof paginationSchema>;
