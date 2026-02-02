// src/app/api/payments/route.ts
// Payment Management API Routes

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireOrgAdminByOrgId } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { 
  parseBody, 
  parseQueryParams, 
  formatZodErrors,
  cuidSchema,
  paymentStatusSchema,
  paginationSchema,
} from '@/lib/validation/schemas';

// Query schema for GET
const getPaymentsQuerySchema = z.object({
  orgId: cuidSchema,
  status: paymentStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Body schema for POST
const createPaymentBodySchema = z.object({
  orgId: cuidSchema,
  payeeId: cuidSchema,
  amount: z.number().positive('Amount must be greater than 0'),
  token: z.enum(['SOL', 'USDC', 'VPAY']).default('SOL'),
});

// GET /api/payments - Get payments for an organization
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parseResult = parseQueryParams(getPaymentsQuerySchema, searchParams);
    
    if (!parseResult.success) {
      const errorResult = parseResult as { success: false; error: z.ZodError };
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(errorResult.error) },
        { status: 400 }
      );
    }
    
    const { orgId, status, limit, offset } = parseResult.data;

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    const where: Record<string, unknown> = { orgId };
    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          payee: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      total,
      hasMore: offset + payments.length < total,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching payments');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = parseBody(createPaymentBodySchema, body);
    
    if (!parseResult.success) {
      const errorResult = parseResult as { success: false; error: z.ZodError };
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(errorResult.error) },
        { status: 400 }
      );
    }
    
    const { orgId, payeeId, amount, token } = parseResult.data;

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    // Verify payee exists and is approved
    const payee = await prisma.payee.findUnique({
      where: { id: payeeId },
    });

    if (!payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    if (payee.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Payee does not belong to this organization' },
        { status: 403 }
      );
    }

    // Check compliance status
    if (payee.rangeStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot create payment for rejected payee' },
        { status: 403 }
      );
    }

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        orgId,
        payeeId,
        amount,
        token,
        status: 'pending',
      },
      include: {
        payee: true,
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Error creating payment');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
