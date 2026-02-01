// src/app/api/cron/recurring-payments/route.ts
// Cron API for processing recurring payments
// Called by external cron service (e.g., Vercel Cron, GitHub Actions)

import { NextRequest, NextResponse } from 'next/server';
import {
  createRecurringPaymentRecords,
  executePendingRecurringPayments,
} from '@/lib/scheduler';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/recurring-payments
 * Process due recurring payments
 * 
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 * 
 * Body:
 *   autoExecute: boolean (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.warn({}, 'CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 500 }
      );
    }

    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if recurring payments are enabled
    const enabled = process.env.RECURRING_PAYMENTS_ENABLED === 'true';
    if (!enabled) {
      return NextResponse.json({
        success: true,
        message: 'Recurring payments are disabled',
        created: 0,
        pending: 0,
      });
    }

    // Parse request body
    let autoExecute = false;
    try {
      const body = await request.json();
      autoExecute = body.autoExecute === true;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Override with env setting
    if (process.env.RECURRING_AUTO_EXECUTE === 'true') {
      autoExecute = true;
    }

    logger.info({ autoExecute }, 'Processing recurring payments');

    // Step 1: Create payment records for due recurring payments
    const createResult = await createRecurringPaymentRecords();
    logger.info({ createResult }, 'Created payment records');

    // Step 2: Execute pending payments (if enabled)
    const executeResult = await executePendingRecurringPayments(autoExecute);
    logger.info({ executeResult }, 'Execute result');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      created: createResult.created,
      skipped: createResult.skipped,
      executed: executeResult.executed,
      pending: executeResult.pending,
      errors: [...createResult.errors, ...executeResult.errors],
    });
  } catch (error) {
    logger.error({ error }, 'Error processing recurring payments');
    return NextResponse.json(
      {
        error: 'Failed to process recurring payments',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/recurring-payments
 * Health check for cron endpoint
 */
export async function GET(request: NextRequest) {
  const enabled = process.env.RECURRING_PAYMENTS_ENABLED === 'true';
  const autoExecute = process.env.RECURRING_AUTO_EXECUTE === 'true';

  return NextResponse.json({
    status: 'ok',
    recurringPayments: {
      enabled,
      autoExecute,
    },
    timestamp: new Date().toISOString(),
  });
}
