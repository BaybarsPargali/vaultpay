// src/app/api/payees/[id]/route.ts
// Single Payee API Routes

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { rangeClient } from '@/lib/range/client';
import type { UpdatePayeeInput } from '@/types';
import { requireOrgAdminByPayeeId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/payees/[id] - Get a single payee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPayeeId(request, id);
    if (auth.ok === false) return auth.response;

    const payee = await prisma.payee.findUnique({
      where: { id },
    });

    if (!payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    return NextResponse.json({ payee });
  } catch (error) {
    console.error('Error fetching payee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/payees/[id] - Update a payee
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPayeeId(request, id);
    if (auth.ok === false) return auth.response;

    const body: UpdatePayeeInput = await request.json();

    // If wallet address is being updated, re-screen with Range
    if (body.walletAddress) {
      try {
        const screeningResult = await rangeClient.screenAddress(
          body.walletAddress
        );
        body.rangeStatus = screeningResult.approved ? 'approved' : 'flagged';
        body.rangeRiskScore = screeningResult.riskScore;
      } catch (screenError) {
        console.error('Range screening error:', screenError);
        body.rangeStatus = 'pending';
      }
    }

    const payee = await prisma.payee.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ payee });
  } catch (error) {
    console.error('Error updating payee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/payees/[id] - Delete a payee
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPayeeId(request, id);
    if (auth.ok === false) return auth.response;

    await prisma.payee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/payees/[id]/rescreen - Re-screen payee with Range
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const auth = await requireOrgAdminByPayeeId(request, id);
    if (auth.ok === false) return auth.response;

    const payee = await prisma.payee.findUnique({
      where: { id },
    });

    if (!payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    // Re-screen with Range (use safe method that won't throw)
    const screeningResult = await rangeClient.safeScreenAddress(payee.walletAddress);

    const updatedPayee = await prisma.payee.update({
      where: { id },
      data: {
        rangeStatus: screeningResult.approved ? 'approved' : 'flagged',
        rangeRiskScore: screeningResult.riskScore,
      },
    });

    return NextResponse.json({
      payee: updatedPayee,
      screeningResult,
    });
  } catch (error) {
    console.error('Error rescreening payee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
