// src/lib/scheduler/index.ts
// Recurring Payment Scheduler
// Backend cron job for automated recurring payments

import {
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
} from 'date-fns';
import prisma from '@/lib/db/prisma';
import type { RecurringSchedule } from '@/types';
import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate the next payment date based on schedule
 */
export function getNextPaymentDate(
  schedule: RecurringSchedule,
  fromDate: Date = new Date()
): Date {
  const baseDate = startOfDay(fromDate);

  switch (schedule) {
    case 'weekly':
      return addWeeks(baseDate, 1);
    case 'biweekly':
      return addWeeks(baseDate, 2);
    case 'monthly':
      return addMonths(baseDate, 1);
    default:
      throw new Error(`Unknown schedule: ${schedule}`);
  }
}

/**
 * Get all recurring payment templates that are due for execution
 */
export async function getDueRecurringPayments(): Promise<
  Array<{
    id: string;
    orgId: string;
    payeeId: string;
    amount: Decimal;
    token: string;
    schedule: string;
    nextRunDate: Date;
    payee: {
      id: string;
      name: string;
      walletAddress: string;
      rangeStatus: string;
    };
  }>
> {
  const now = new Date();

  const duePayments = await prisma.recurringPaymentTemplate.findMany({
    where: {
      isActive: true,
      nextRunDate: {
        lte: now,
      },
    },
    include: {
      payee: {
        select: {
          id: true,
          name: true,
          walletAddress: true,
          rangeStatus: true,
        },
      },
    },
    orderBy: {
      nextRunDate: 'asc',
    },
  });

  return duePayments;
}

/**
 * Create payment records for due recurring payments
 */
export async function createRecurringPaymentRecords(): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const duePayments = await getDueRecurringPayments();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const template of duePayments) {
    try {
      // Check compliance status
      if (template.payee.rangeStatus === 'rejected') {
        skipped++;
        errors.push(
          `Skipped payment for ${template.payee.name}: Failed compliance check`
        );
        continue;
      }

      // Create payment record
      await prisma.payment.create({
        data: {
          orgId: template.orgId,
          payeeId: template.payeeId,
          amount: template.amount,
          token: template.token,
          status: 'pending',
          isRecurring: true,
          recurringSchedule: template.schedule,
          parentPaymentId: template.id,
        },
      });

      // Update next run date
      const nextDate = getNextPaymentDate(
        template.schedule as RecurringSchedule,
        template.nextRunDate
      );

      await prisma.recurringPaymentTemplate.update({
        where: { id: template.id },
        data: {
          lastRunDate: new Date(),
          nextRunDate: nextDate,
        },
      });

      created++;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(
        `Error creating payment for ${template.payee.name}: ${errorMsg}`
      );
    }
  }

  return { created, skipped, errors };
}

/**
 * Execute all pending recurring payments
 * This is called by the cron job after createRecurringPaymentRecords
 */
export async function executePendingRecurringPayments(
  autoExecute: boolean = false
): Promise<{
  executed: number;
  pending: number;
  errors: string[];
}> {
  if (!autoExecute) {
    // Return pending count for manual execution
    const pendingCount = await prisma.payment.count({
      where: {
        isRecurring: true,
        status: 'pending',
      },
    });

    return {
      executed: 0,
      pending: pendingCount,
      errors: [],
    };
  }

  // Auto-execution would require wallet access
  // This should be handled by the frontend/admin dashboard
  const pendingPayments = await prisma.payment.findMany({
    where: {
      isRecurring: true,
      status: 'pending',
    },
  });

  return {
    executed: 0,
    pending: pendingPayments.length,
    errors: ['Auto-execution requires admin approval'],
  };
}

/**
 * Create a new recurring payment template
 */
export async function createRecurringPaymentTemplate(
  orgId: string,
  payeeId: string,
  amount: number,
  token: string = 'SOL',
  schedule: RecurringSchedule,
  startDate?: Date
): Promise<{ id: string; nextRunDate: Date }> {
  const nextRunDate = startDate || getNextPaymentDate(schedule);

  const template = await prisma.recurringPaymentTemplate.create({
    data: {
      orgId,
      payeeId,
      amount,
      token,
      schedule,
      nextRunDate,
      isActive: true,
    },
  });

  return {
    id: template.id,
    nextRunDate: template.nextRunDate,
  };
}

/**
 * Update a recurring payment template
 */
export async function updateRecurringPaymentTemplate(
  templateId: string,
  updates: {
    amount?: number;
    schedule?: RecurringSchedule;
    isActive?: boolean;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (updates.amount !== undefined) {
    updateData.amount = updates.amount;
  }

  if (updates.schedule !== undefined) {
    updateData.schedule = updates.schedule;
    // Recalculate next run date if schedule changed
    const template = await prisma.recurringPaymentTemplate.findUnique({
      where: { id: templateId },
    });
    if (template) {
      updateData.nextRunDate = getNextPaymentDate(
        updates.schedule,
        template.lastRunDate || new Date()
      );
    }
  }

  if (updates.isActive !== undefined) {
    updateData.isActive = updates.isActive;
  }

  await prisma.recurringPaymentTemplate.update({
    where: { id: templateId },
    data: updateData,
  });
}

/**
 * Cancel/deactivate a recurring payment template
 */
export async function cancelRecurringPayment(templateId: string): Promise<void> {
  await prisma.recurringPaymentTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  });
}

/**
 * Get all recurring payment templates for an organization
 */
export async function getRecurringPayments(orgId: string): Promise<
  Array<{
    id: string;
    payeeId: string;
    amount: Decimal;
    token: string;
    schedule: string;
    nextRunDate: Date;
    lastRunDate: Date | null;
    isActive: boolean;
    payee: {
      name: string;
      email: string;
      walletAddress: string;
    };
  }>
> {
  return prisma.recurringPaymentTemplate.findMany({
    where: { orgId },
    include: {
      payee: {
        select: {
          name: true,
          email: true,
          walletAddress: true,
        },
      },
    },
    orderBy: { nextRunDate: 'asc' },
  });
}

/**
 * Get upcoming recurring payments for the next N days
 */
export async function getUpcomingRecurringPayments(
  orgId: string,
  days: number = 7
): Promise<
  Array<{
    id: string;
    payeeName: string;
    amount: Decimal;
    token: string;
    scheduledDate: Date;
  }>
> {
  const endDate = addDays(new Date(), days);

  const upcoming = await prisma.recurringPaymentTemplate.findMany({
    where: {
      orgId,
      isActive: true,
      nextRunDate: {
        lte: endDate,
      },
    },
    include: {
      payee: {
        select: { name: true },
      },
    },
    orderBy: { nextRunDate: 'asc' },
  });

  return upcoming.map((t) => ({
    id: t.id,
    payeeName: t.payee.name,
    amount: t.amount,
    token: t.token,
    scheduledDate: t.nextRunDate,
  }));
}

/**
 * Format schedule for display
 */
export function formatSchedule(schedule: RecurringSchedule): string {
  switch (schedule) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Monthly';
    default:
      return schedule;
  }
}

/**
 * Get schedule options for UI
 */
export function getScheduleOptions(): Array<{
  value: RecurringSchedule;
  label: string;
}> {
  return [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
  ];
}
