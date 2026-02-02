// src/app/api/payments/batch/route.ts
// Batch Payment API Route with Arcium MPC Support

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { executeBatchPayments } from '@/lib/services/payment-service';
import type { BatchPaymentInput } from '@/types';
import { requireOrgAdminByOrgId } from '@/lib/auth';

// POST /api/payments/batch - Create multiple payments (batch payroll)
export async function POST(request: NextRequest) {
  try {
    const body: BatchPaymentInput & { execute?: boolean; senderPublicKey?: string } = await request.json();
    const { orgId, payments, token = 'SOL', execute = false, senderPublicKey } = body;

    if (!orgId || !payments || payments.length === 0) {
      return NextResponse.json(
        { error: 'orgId and payments array are required' },
        { status: 400 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    if (senderPublicKey && senderPublicKey !== auth.wallet) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify all payees exist and are approved
    const payeeIds = payments.map((p) => p.payeeId);
    const payees = await prisma.payee.findMany({
      where: {
        id: { in: payeeIds },
        orgId,
      },
    });

    if (payees.length !== payeeIds.length) {
      return NextResponse.json(
        { error: 'One or more payees not found or not in organization' },
        { status: 404 }
      );
    }

    // Check for rejected payees
    const rejectedPayees = payees.filter((p) => p.rangeStatus === 'rejected');
    if (rejectedPayees.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot create payments for rejected payees',
          rejectedPayees: rejectedPayees.map((p) => p.id),
        },
        { status: 403 }
      );
    }

    // Create all payments
    const createdPayments = await prisma.$transaction(
      payments.map((p) =>
        prisma.payment.create({
          data: {
            orgId,
            payeeId: p.payeeId,
            amount: p.amount,
            token,
            status: 'pending',
          },
          include: {
            payee: true,
          },
        })
      )
    );

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    // If execute flag is true and senderPublicKey is provided, execute immediately
    if (execute && senderPublicKey) {
      const paymentIds = createdPayments.map((p) => p.id);
      const executionResult = await executeBatchPayments(paymentIds, senderPublicKey);

      return NextResponse.json(
        {
          payments: createdPayments,
          count: createdPayments.length,
          totalAmount,
          execution: {
            executed: true,
            successful: executionResult.successful.length,
            failed: executionResult.failed.length,
            totalProcessed: executionResult.totalProcessed,
            encryption: executionResult.batchEncryption
              ? {
                  algorithm: 'Arcium MPC (Rescue Cipher)',
                  publicKey: executionResult.batchEncryption.publicKey,
                  totalPayments: executionResult.batchEncryption.totalPayments,
                }
              : null,
            results: executionResult,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        payments: createdPayments,
        count: createdPayments.length,
        totalAmount,
        execution: {
          executed: false,
          message: 'Payments created. Call /api/payments/execute with paymentIds to execute via Arcium MPC.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating batch payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

