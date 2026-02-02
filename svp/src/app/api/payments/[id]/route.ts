// src/app/api/payments/[id]/route.ts
// Single Payment API Routes

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireOrgAdminByPaymentId } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/payments/[id] - Get a single payment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPaymentId(request, id);
    if (auth.ok === false) return auth.response;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        payee: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    logger.error({ error }, 'Error fetching payment');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/payments/[id] - Update payment status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPaymentId(request, id);
    if (auth.ok === false) return auth.response;
    const body = await request.json();
    const { status, txSignature, stealthAddress, errorMessage } = body;

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.executedAt = new Date();
      }
    }

    if (txSignature) {
      updateData.txSignature = txSignature;
    }

    if (stealthAddress) {
      updateData.stealthAddress = stealthAddress;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        payee: true,
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    logger.error({ error }, 'Error updating payment');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id] - Cancel a pending payment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPaymentId(request, id);
    if (auth.ok === false) return auth.response;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending payments can be cancelled' },
        { status: 400 }
      );
    }

    await prisma.payment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting payment');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
