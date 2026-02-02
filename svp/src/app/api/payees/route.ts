// src/app/api/payees/route.ts
// Payee Management API Routes

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { rangeClient } from '@/lib/range/client';
import { requireOrgAdminByOrgId } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { 
  parseBody, 
  parseQueryParams, 
  formatZodErrors,
  cuidSchema,
  emailSchema,
  solanaPublicKeySchema,
  nonEmptyStringSchema,
} from '@/lib/validation/schemas';

// Query schema for GET
const getPayeesQuerySchema = z.object({
  orgId: cuidSchema,
});

// Body schema for POST
const createPayeeBodySchema = z.object({
  orgId: cuidSchema,
  name: nonEmptyStringSchema.max(100, 'Name must be 100 characters or less'),
  email: emailSchema,
  walletAddress: solanaPublicKeySchema,
});

// GET /api/payees - Get payees for an organization
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parseResult = parseQueryParams(getPayeesQuerySchema, searchParams);
    
    if (!parseResult.success) {
      const errorResult = parseResult as { success: false; error: z.ZodError };
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(errorResult.error) },
        { status: 400 }
      );
    }
    
    const { orgId } = parseResult.data;

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    const payees = await prisma.payee.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payees });
  } catch (error) {
    logger.error({ error }, 'Error fetching payees');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/payees - Create a new payee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = parseBody(createPayeeBodySchema, body);
    
    if (!parseResult.success) {
      const errorResult = parseResult as { success: false; error: z.ZodError };
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(errorResult.error) },
        { status: 400 }
      );
    }
    
    const { orgId, name, email, walletAddress } = parseResult.data;

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if payee with same email already exists in org
    const existingPayee = await prisma.payee.findUnique({
      where: {
        orgId_email: {
          orgId,
          email,
        },
      },
    });

    if (existingPayee) {
      return NextResponse.json(
        { error: 'A payee with this email already exists in the organization' },
        { status: 409 }
      );
    }

    // Screen wallet address with Range compliance (using safe method)
    const screeningResult = await rangeClient.safeScreenAddress(walletAddress);
    const rangeStatus = screeningResult.approved ? 'approved' : 'flagged';
    const rangeRiskScore = screeningResult.riskScore;

    // Create the payee
    const payee = await prisma.payee.create({
      data: {
        orgId,
        name,
        email,
        walletAddress,
        rangeStatus,
        rangeRiskScore,
      },
    });

    return NextResponse.json({ payee }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Error creating payee');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
