// src/app/api/recurring/[id]/route.ts
// Individual recurring payment template API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import {
  updateRecurringPaymentTemplate,
  cancelRecurringPayment,
} from '@/lib/scheduler';
import type { RecurringSchedule } from '@/types';
import { requireOrgAdminByOrgId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recurring/[id]
 * Get a single recurring payment template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const template = await prisma.recurringPaymentTemplate.findUnique({
      where: { id },
      include: {
        payee: {
          select: {
            name: true,
            email: true,
            walletAddress: true,
            rangeStatus: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Recurring payment not found' },
        { status: 404 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, template.orgId);
    if (auth.ok === false) return auth.response;

    return NextResponse.json({ template });
  } catch (error) {
    logger.error({ error }, 'Error fetching recurring payment');
    return NextResponse.json(
      { error: 'Failed to fetch recurring payment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recurring/[id]
 * Update a recurring payment template
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, schedule, isActive } = body;

    // Verify template exists
    const existing = await prisma.recurringPaymentTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Recurring payment not found' },
        { status: 404 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, existing.orgId);
    if (auth.ok === false) return auth.response;

    // Validate schedule if provided
    if (schedule) {
      const validSchedules: RecurringSchedule[] = ['weekly', 'biweekly', 'monthly'];
      if (!validSchedules.includes(schedule)) {
        return NextResponse.json(
          { error: 'Invalid schedule. Must be: weekly, biweekly, or monthly' },
          { status: 400 }
        );
      }
    }

    // Update template
    await updateRecurringPaymentTemplate(id, {
      amount,
      schedule,
      isActive,
    });

    // Fetch updated template
    const updated = await prisma.recurringPaymentTemplate.findUnique({
      where: { id },
      include: {
        payee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Error updating recurring payment');
    return NextResponse.json(
      { error: 'Failed to update recurring payment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recurring/[id]
 * Delete/cancel a recurring payment template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify template exists
    const existing = await prisma.recurringPaymentTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Recurring payment not found' },
        { status: 404 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, existing.orgId);
    if (auth.ok === false) return auth.response;

    // Deactivate instead of hard delete to preserve history
    await cancelRecurringPayment(id);

    return NextResponse.json({
      success: true,
      message: 'Recurring payment cancelled',
    });
  } catch (error) {
    logger.error({ error }, 'Error cancelling recurring payment');
    return NextResponse.json(
      { error: 'Failed to cancel recurring payment' },
      { status: 500 }
    );
  }
}
