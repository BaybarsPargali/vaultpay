// src/app/api/payments/private/route.ts
// ============================================================================
// COMPLIANT PRIVATE PAYMENT API
// ============================================================================
//
// This endpoint executes truly private payments:
// 1. Validates compliance via Range Protocol
// 2. Executes Token-2022 Confidential Transfer via CLI
// 3. Amount is ENCRYPTED on-chain (ElGamal + ZK proofs)
//
// PRIVACY GUARANTEE:
// - Amount NEVER visible on-chain (encrypted by Token-2022)
// - Compliance check only sees recipient address, not amount
// - Uses production-grade ZK proofs from Rust CLI
//
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireWalletAuth } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';
import { 
  executeCompliantTransfer, 
  isCompliantTransferAvailable 
} from '@/lib/cosigner/compliant-transfer';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const privatePaymentSchema = z.object({
  /** Recipient's wallet address */
  recipientWallet: z.string().min(32).max(44),
  /** Amount to transfer (in tokens) */
  amount: z.number().positive(),
  /** Organization ID */
  organizationId: z.string(),
  /** Optional payment ID for database update */
  paymentId: z.string().uuid().optional(),
});

// ============================================================================
// POST /api/payments/private - Execute private payment
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      );
    }

    // 2. Wallet authentication
    const authResult = await requireWalletAuth(request);
    if (!authResult.ok) {
      return (authResult as { ok: false; response: NextResponse }).response;
    }
    const senderWallet = authResult.wallet;

    // 3. Parse and validate request
    const body = await request.json();
    const validation = privatePaymentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { recipientWallet, amount, organizationId, paymentId } = validation.data;

    // 4. Verify organization ownership
    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        adminWallet: senderWallet,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      );
    }

    logger.info(
      { senderWallet, recipientWallet, amount, organizationId, paymentId },
      '[PrivatePayment] Processing request'
    );

    // 5. Execute compliant confidential transfer
    const result = await executeCompliantTransfer({
      senderWallet,
      recipientWallet,
      amount,
      organizationId,
      paymentId,
    });

    const duration = Date.now() - startTime;

    if (!result.success) {
      logger.warn(
        { 
          recipientWallet, 
          error: result.error,
          compliance: result.compliance,
          duration,
        },
        '[PrivatePayment] Transfer failed'
      );

      return NextResponse.json({
        success: false,
        error: result.error,
        compliance: {
          approved: result.compliance.approved,
          riskScore: result.compliance.riskScore,
          riskLevel: result.compliance.riskLevel,
          reason: result.compliance.reason,
        },
      }, { status: result.compliance.approved ? 500 : 403 });
    }

    logger.info(
      { 
        txSignature: result.txSignature, 
        recipientWallet, 
        duration,
      },
      '[PrivatePayment] Transfer completed'
    );

    return NextResponse.json({
      success: true,
      txSignature: result.txSignature,
      compliance: {
        approved: true,
        riskScore: result.compliance.riskScore,
        riskLevel: result.compliance.riskLevel,
      },
      message: 'Private payment completed. Amount is encrypted on-chain.',
    });

  } catch (error) {
    logger.error({ error }, '[PrivatePayment] Unexpected error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/payments/private - Check availability
// ============================================================================

export async function GET() {
  const status = await isCompliantTransferAvailable();

  return NextResponse.json({
    service: 'VaultPay Private Payments',
    version: '2.0.0',
    architecture: 'Compliant Confidential Transfer',
    ...status,
    description: status.available
      ? 'Ready for private payments. Amounts are encrypted on-chain.'
      : 'CLI bridge not available. Install spl-token CLI on server.',
    privacy: {
      amountVisibility: 'ENCRYPTED (ElGamal + ZK proofs)',
      complianceData: 'Recipient address only',
      proofGeneration: 'Rust CLI (production-grade Bulletproofs)',
    },
    requirements: {
      cli: 'spl-token CLI must be installed',
      network: 'Works on Devnet and Mainnet',
      mint: status.mint,
    },
  });
}
