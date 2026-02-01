// src/app/api/payments/execute/route.ts
// Payment Execution API Route (Arcium MPC Confidential Transfers)

import { NextRequest, NextResponse } from 'next/server';
import { executePayment, executeConfidentialPayment, executeBatchPayments } from '@/lib/services/payment-service';
import { requireWalletAuth, requireOrgAdminByPaymentId } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

// POST /api/payments/execute - Execute payment(s) via Arcium MPC
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.ok === false) return auth.response;

    const body = await request.json();
    const { 
      paymentId, 
      paymentIds, 
      senderPublicKey, 
      txSignature,
      confidential,
      encryptedData,
      computationOffset,
    } = body;

    if (!senderPublicKey) {
      return NextResponse.json(
        { error: 'senderPublicKey is required' },
        { status: 400 }
      );
    }

    if (senderPublicKey !== auth.wallet) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle batch execution
    if (paymentIds && Array.isArray(paymentIds) && paymentIds.length > 0) {
      // Enforce org-admin for every payment in the batch
      const payments = await prisma.payment.findMany({
        where: { id: { in: paymentIds } },
        select: { id: true, orgId: true },
      });

      if (payments.length !== paymentIds.length) {
        return NextResponse.json({ error: 'One or more payments not found' }, { status: 404 });
      }

      const uniqueOrgIds = Array.from(new Set(payments.map((p) => p.orgId)));
      if (uniqueOrgIds.length !== 1) {
        return NextResponse.json(
          { error: 'Batch execution must target a single organization' },
          { status: 400 }
        );
      }

      const org = await prisma.organization.findUnique({ where: { id: uniqueOrgIds[0] } });
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      if (org.adminWallet !== auth.wallet) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const batchResult = await executeBatchPayments(paymentIds, senderPublicKey);

      return NextResponse.json({
        batch: true,
        ...batchResult,
      });
    }

    // Handle single payment execution
    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId or paymentIds is required' },
        { status: 400 }
      );
    }

    const singleAuth = await requireOrgAdminByPaymentId(request, paymentId);
    if (singleAuth.ok === false) return singleAuth.response;

    // Handle CONFIDENTIAL transfer (amount encrypted on-chain)
    if (confidential && txSignature && encryptedData) {
      const result = await executeConfidentialPayment(
        paymentId,
        senderPublicKey,
        txSignature,
        encryptedData,
        computationOffset
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.errorMessage },
          { status: 400 }
        );
      }

      return NextResponse.json({
        payment: {
          id: result.paymentId,
          status: 'completed',
          txSignature: result.txSignature,
          encryptedRecipient: result.encryptedRecipient,
        },
        encryption: {
          algorithm: 'Arcium MPC (Rescue Cipher)',
          confidential: true,
          ciphertext: result.ciphertext,
          nonce: result.nonce,
          ephemeralPubKey: result.ephemeralPubKey,
        },
        transaction: {
          signature: result.txSignature,
          onChainDataEncrypted: true, // Amount NOT visible on-chain!
        },
      });
    }

    // PRIVACY FIRST: Reject any attempt to use non-confidential transfers
    if (confidential === false) {
      return NextResponse.json(
        { 
          error: 'Non-confidential transfers are disabled. VaultPay requires privacy-preserving transactions.',
          privacyViolation: true,
        },
        { status: 403 }
      );
    }

    // Legacy: MPC encrypted transfer (requires provider on client side)
    const result = await executePayment(paymentId, senderPublicKey, txSignature);

    if (!result.success) {
      const statusCode = result.errorMessage?.includes('not found')
        ? 404
        : result.errorMessage?.includes('compliance')
          ? 403
          : 400;

      return NextResponse.json(
        { error: result.errorMessage },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      payment: {
        id: result.paymentId,
        status: 'completed',
        txSignature: result.txSignature,
        encryptedRecipient: result.encryptedRecipient,
      },
      encryption: {
        algorithm: 'Arcium MPC (Rescue Cipher)',
        ciphertext: result.ciphertext,
        nonce: result.nonce,
        ephemeralPubKey: result.ephemeralPubKey,
      },
      transaction: {
        signature: result.txSignature,
        encryptedRecipient: result.encryptedRecipient,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error executing payment');
    return NextResponse.json(
      {
        error: 'Payment execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

