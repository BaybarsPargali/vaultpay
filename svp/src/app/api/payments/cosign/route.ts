// src/app/api/payments/cosign/route.ts
// ============================================================================
// ARCIUM CO-SIGNER API ENDPOINT
// ============================================================================
//
// This endpoint receives partially signed Token-2022 Confidential Transfer
// transactions and co-signs them if compliance checks pass.
//
// FLOW:
// 1. User builds CT transaction (amount is encrypted by Token-2022)
// 2. User signs and sends to this endpoint
// 3. We validate compliance via Range Protocol
// 4. If approved, Arcium signs with MPC key
// 5. Return fully signed transaction to user
// 6. User submits to Solana
//
// PRIVACY:
// - Amount is NEVER visible in plaintext
// - We only see encrypted ciphertext (ElGamal)
// - Compliance is based on recipient address only
//
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Transaction } from '@solana/web3.js';
import { coSignerService, CoSignerClient } from '@/lib/cosigner';
import { connection } from '@/lib/solana/connection';
import { requireWalletAuth } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const coSignRequestSchema = z.object({
  /** Base64 serialized transaction */
  serializedTx: z.string().min(1),
  /** User's wallet public key */
  senderPubkey: z.string().min(32).max(44),
  /** Organization ID */
  organizationId: z.string().uuid(),
  /** Optional payment ID for database update */
  paymentId: z.string().uuid().optional(),
});

type CoSignRequest = z.infer<typeof coSignRequestSchema>;

// ============================================================================
// POST /api/payments/cosign
// ============================================================================

// Strict rate limit for co-signer endpoint (prevents abuse/DoS)
const COSIGN_RATE_LIMIT = { 
  maxRequests: 10, 
  windowMs: 60 * 1000, // 10 requests per minute
  prefix: 'cosign' 
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate limiting (STRICT - this endpoint pays gas/uses compute)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(clientId, COSIGN_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      logger.warn({ clientId, retryAfter: rateLimitResult.retryAfter }, 'Rate limit exceeded for co-sign endpoint');
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait before trying again.', 
          retryAfter: rateLimitResult.retryAfter,
          message: 'Co-signer rate limit: 10 requests per minute'
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetAt / 1000)),
          }
        }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = coSignRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error.errors }, 'Invalid co-sign request');
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { serializedTx, senderPubkey, organizationId, paymentId } = validationResult.data;

    // 3. Verify wallet authentication
    const authResult = await requireWalletAuth(request);
    if (!authResult.ok) {
      logger.warn({ senderPubkey }, 'Unauthorized co-sign request');
      return (authResult as { ok: false; response: NextResponse }).response;
    }

    // Now we know authResult.ok is true, so wallet is available
    const authenticatedWallet = authResult.wallet;

    // Verify the authenticated wallet matches the sender
    if (authenticatedWallet !== senderPubkey) {
      logger.warn(
        { authenticated: authenticatedWallet, sender: senderPubkey },
        'Wallet mismatch in co-sign request'
      );
      return NextResponse.json(
        { error: 'Wallet address mismatch' },
        { status: 403 }
      );
    }

    // 4. Verify organization ownership
    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        adminWallet: senderPubkey,
      },
    });

    if (!organization) {
      logger.warn({ organizationId, senderPubkey }, 'Organization not found or not owned');
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      );
    }

    logger.info(
      { organizationId, senderPubkey, paymentId },
      'Processing co-sign request'
    );

    // 5. IDEMPOTENCY CHECK: Prevent double co-signing
    if (paymentId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true, txSignature: true },
      });

      if (existingPayment?.txSignature) {
        logger.warn(
          { paymentId, txSignature: existingPayment.txSignature },
          'Idempotency check: Payment already co-signed'
        );
        return NextResponse.json({
          success: true,
          signedTransaction: null,
          txSignature: existingPayment.txSignature,
          message: 'Payment was already processed (idempotent)',
          idempotent: true,
        });
      }

      if (existingPayment?.status === 'completed') {
        logger.warn({ paymentId }, 'Idempotency check: Payment already completed');
        return NextResponse.json(
          { error: 'Payment already completed' },
          { status: 409 }
        );
      }
    }

    // 6. Deserialize and validate transaction
    let transaction: Transaction;
    try {
      const txBuffer = Buffer.from(serializedTx, 'base64');
      transaction = Transaction.from(txBuffer);
    } catch (error) {
      logger.error({ error }, 'Failed to deserialize transaction');
      return NextResponse.json(
        { error: 'Invalid transaction format' },
        { status: 400 }
      );
    }

    // 6. Extract recipient for compliance check
    const client = new CoSignerClient({
      connection,
      adminKey: new PublicKey(senderPubkey),
    });
    
    const recipientAccount = client.extractRecipientFromTransaction(transaction);
    if (!recipientAccount) {
      logger.warn({ txInstructions: transaction.instructions.length }, 'No recipient found in transaction');
      return NextResponse.json(
        { error: 'Could not extract recipient from transaction' },
        { status: 400 }
      );
    }

    const recipientAddress = recipientAccount.toBase58();
    logger.info({ recipientAddress }, 'Recipient extracted from transaction');

    // 7. Compliance check via Range Protocol
    const compliance = await client.validateCompliance(recipientAddress);
    
    logger.info(
      { 
        recipientAddress, 
        approved: compliance.approved, 
        riskScore: compliance.riskScore,
        riskLevel: compliance.riskLevel,
      },
      'Compliance check completed'
    );

    if (!compliance.approved) {
      // Update payment status if paymentId provided
      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'rejected',
            errorMessage: compliance.reason,
          },
        });
      }

      logger.warn(
        { recipientAddress, reason: compliance.reason },
        'Co-sign rejected due to compliance'
      );

      return NextResponse.json({
        success: false,
        error: 'Compliance check failed',
        compliance: {
          approved: false,
          riskScore: compliance.riskScore,
          riskLevel: compliance.riskLevel,
          reason: compliance.reason,
        },
      }, { status: 403 });
    }

    // 8. Co-sign the transaction with Arcium
    const coSignResult = await coSignerService.processCoSignRequest({
      serializedTx,
      userSignature: '', // User already signed, included in serializedTx
      senderPubkey,
      organizationId,
      paymentId,
    });

    if (!coSignResult.success) {
      logger.error({ error: coSignResult.error }, 'Co-signing failed');
      return NextResponse.json({
        success: false,
        error: coSignResult.error || 'Co-signing failed',
        compliance: coSignResult.compliance,
      }, { status: 500 });
    }

    // 9. Update payment status if paymentId provided
    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'processing',
          // Note: txSignature will be updated after user submits to Solana
        },
      });
    }

    const duration = Date.now() - startTime;
    logger.info(
      { 
        organizationId, 
        paymentId, 
        recipientAddress,
        duration,
      },
      'Co-sign successful'
    );

    // 10. Return the fully signed transaction
    return NextResponse.json({
      success: true,
      signedTransaction: coSignResult.signedTransaction,
      compliance: {
        approved: true,
        riskScore: compliance.riskScore,
        riskLevel: compliance.riskLevel,
      },
      message: 'Transaction co-signed. Submit to Solana to complete.',
    });

  } catch (error) {
    logger.error({ error }, 'Unexpected error in co-sign endpoint');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/payments/cosign - Health check and info
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'VaultPay Co-Signer',
    version: '2.0.0',
    architecture: 'Compliance Co-Signer',
    description: 'Arcium MPC-based compliance gating for Token-2022 Confidential Transfers',
    features: [
      'Token-2022 Confidential Transfer (amount encrypted)',
      'Range Protocol compliance screening',
      'Arcium MPC co-signing',
      '2-of-2 multisig pattern',
    ],
    privacy: {
      amountVisibility: 'ENCRYPTED (ElGamal)',
      complianceData: 'Recipient address only',
      signingKey: 'MPC distributed (no single party access)',
    },
    endpoints: {
      POST: 'Submit transaction for co-signing',
      GET: 'This info endpoint',
    },
  });
}
