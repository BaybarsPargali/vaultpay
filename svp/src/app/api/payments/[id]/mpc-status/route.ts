// src/app/api/payments/[id]/mpc-status/route.ts
// MPC Status API - Check and update MPC computation status

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { vaultPayProgram } from '@/lib/arcium/program';
import { requireOrgAdminByPaymentId } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]/mpc-status
 * Get the current MPC computation status for a payment
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPaymentId(request, id);
    if (auth.ok === false) return auth.response;

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        computationOffset: true,
        mpcStatus: true,
        mpcTxSignature: true,
        mpcFinalizedAt: true,
        status: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If no computation offset, MPC was not used
    if (!payment.computationOffset) {
      return NextResponse.json({
        paymentId: id,
        mpcUsed: false,
        mpcStatus: null,
      });
    }

    // Check on-chain status if not finalized
    let onChainStatus = payment.mpcStatus;
    if (payment.mpcStatus !== 'finalized' && payment.mpcStatus !== 'failed') {
      const computationOffset = BigInt(payment.computationOffset);
      const result = await vaultPayProgram.getComputationStatus(computationOffset);
      onChainStatus = result.status === 'not_found' ? 'pending' : result.status;

      // Update database if status changed
      if (onChainStatus !== payment.mpcStatus) {
        await prisma.payment.update({
          where: { id },
          data: {
            mpcStatus: onChainStatus,
            mpcFinalizedAt: onChainStatus === 'finalized' ? new Date() : undefined,
          },
        });
      }
    }

    return NextResponse.json({
      paymentId: id,
      mpcUsed: true,
      computationOffset: payment.computationOffset,
      mpcStatus: onChainStatus,
      mpcTxSignature: payment.mpcTxSignature,
      mpcFinalizedAt: payment.mpcFinalizedAt,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting MPC status');
    return NextResponse.json(
      { error: 'Failed to get MPC status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/[id]/mpc-status
 * Trigger MPC finalization check and update
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPaymentId(request, id);
    if (auth.ok === false) return auth.response;
    const body = await request.json();
    const { awaitFinalization = false, timeoutMs = 30000 } = body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        computationOffset: true,
        mpcStatus: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (!payment.computationOffset) {
      return NextResponse.json(
        { error: 'Payment does not have MPC computation' },
        { status: 400 }
      );
    }

    if (payment.mpcStatus === 'finalized') {
      return NextResponse.json({
        paymentId: id,
        mpcStatus: 'finalized',
        message: 'Already finalized',
      });
    }

    const computationOffset = BigInt(payment.computationOffset);

    if (awaitFinalization) {
      // Wait for MPC to finalize
      const result = await vaultPayProgram.awaitMPCFinalization(
        computationOffset,
        timeoutMs
      );

      if (result.success) {
        await prisma.payment.update({
          where: { id },
          data: {
            mpcStatus: 'finalized',
            mpcTxSignature: result.txSignature,
            mpcFinalizedAt: new Date(),
            status: 'completed',
            executedAt: new Date(),
          },
        });

        return NextResponse.json({
          paymentId: id,
          mpcStatus: 'finalized',
          mpcTxSignature: result.txSignature,
        });
      } else {
        await prisma.payment.update({
          where: { id },
          data: {
            mpcStatus: 'failed',
            errorMessage: result.error,
          },
        });

        return NextResponse.json({
          paymentId: id,
          mpcStatus: 'failed',
          error: result.error,
        });
      }
    } else {
      // Just check current status
      const result = await vaultPayProgram.getComputationStatus(computationOffset);
      const newStatus = result.status === 'not_found' ? 'pending' : result.status;

      if (newStatus !== payment.mpcStatus) {
        await prisma.payment.update({
          where: { id },
          data: {
            mpcStatus: newStatus,
            mpcFinalizedAt: newStatus === 'finalized' ? new Date() : undefined,
          },
        });
      }

      return NextResponse.json({
        paymentId: id,
        mpcStatus: newStatus,
        computationPda: result.computationPda,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error updating MPC status');
    return NextResponse.json(
      { error: 'Failed to update MPC status' },
      { status: 500 }
    );
  }
}
