// src/app/api/recurring/route.ts
// Recurring Payments API - CRUD for recurring payment templates

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import {
  createRecurringPaymentTemplate,
  getRecurringPayments,
  getUpcomingRecurringPayments,
  getNextPaymentDate,
} from '@/lib/scheduler';
import type { RecurringSchedule } from '@/types';
import { requireOrgAdminByOrgId } from '@/lib/auth';

/**
 * GET /api/recurring?orgId=xxx
 * List all recurring payment templates for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const upcoming = searchParams.get('upcoming');
    const days = parseInt(searchParams.get('days') || '7');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    if (upcoming === 'true') {
      const upcomingPayments = await getUpcomingRecurringPayments(orgId, days);
      return NextResponse.json({ upcoming: upcomingPayments });
    }

    const templates = await getRecurringPayments(orgId);
    return NextResponse.json({ templates });
  } catch (error) {
    logger.error({ error }, 'Error fetching recurring payments');
    return NextResponse.json(
      { error: 'Failed to fetch recurring payments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recurring
 * Create a new recurring payment template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, payeeId, amount, token, schedule, startDate } = body;

    if (!orgId || !payeeId || !amount || !schedule) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, payeeId, amount, schedule' },
        { status: 400 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    // Validate schedule
    const validSchedules: RecurringSchedule[] = ['weekly', 'biweekly', 'monthly'];
    if (!validSchedules.includes(schedule)) {
      return NextResponse.json(
        { error: 'Invalid schedule. Must be: weekly, biweekly, or monthly' },
        { status: 400 }
      );
    }

    // Validate payee exists and is approved
    const payee = await prisma.payee.findUnique({
      where: { id: payeeId },
    });

    if (!payee) {
      return NextResponse.json(
        { error: 'Payee not found' },
        { status: 404 }
      );
    }

    if (payee.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Payee does not belong to this organization' },
        { status: 403 }
      );
    }

    if (payee.rangeStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot create recurring payment for rejected payee' },
        { status: 400 }
      );
    }

    // Create template
    const result = await createRecurringPaymentTemplate(
      orgId,
      payeeId,
      amount,
      token || 'SOL',
      schedule,
      startDate ? new Date(startDate) : undefined
    );

    return NextResponse.json({
      success: true,
      template: {
        id: result.id,
        nextRunDate: result.nextRunDate,
        payeeId,
        amount,
        token: token || 'SOL',
        schedule,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error creating recurring payment');
    return NextResponse.json(
      { error: 'Failed to create recurring payment' },
      { status: 500 }
    );
  }
}
