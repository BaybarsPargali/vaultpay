// src/app/api/treasury/route.ts
// Treasury API - Get and initialize confidential treasury

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
// Note: ConfidentialTreasury class can be used for future operations
// import { ConfidentialTreasury } from '@/lib/token2022/treasury';
import { requireOrgAdminByOrgId } from '@/lib/auth';

/**
 * GET /api/treasury?orgId=xxx
 * Get treasury information for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        treasuryMint: true,
        treasuryAccount: true,
        elGamalPubKey: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if confidential treasury is set up
    const isConfidentialSetup = !!(org.treasuryMint && org.treasuryAccount);

    return NextResponse.json({
      orgId: org.id,
      orgName: org.name,
      isConfidentialSetup,
      treasuryMint: org.treasuryMint,
      treasuryAccount: org.treasuryAccount,
      elGamalPubKey: org.elGamalPubKey,
      // Note: Actual balance requires ElGamal decryption with secret key
      // This should be done client-side with wallet signature
    });
  } catch (error) {
    logger.error({ error }, 'Error getting treasury');
    return NextResponse.json(
      { error: 'Failed to get treasury information' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/treasury
 * Initialize confidential treasury for an organization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, mintAddress, accountAddress, elGamalPubKey } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    // Verify organization exists and admin matches
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Update organization with treasury info
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        treasuryMint: mintAddress,
        treasuryAccount: accountAddress,
        elGamalPubKey: elGamalPubKey,
      },
    });

    return NextResponse.json({
      success: true,
      treasury: {
        mint: updatedOrg.treasuryMint,
        account: updatedOrg.treasuryAccount,
        elGamalPubKey: updatedOrg.elGamalPubKey,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error initializing treasury');
    return NextResponse.json(
      { error: 'Failed to initialize treasury' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/treasury?orgId=xxx
 * Remove confidential treasury (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const auth = await requireOrgAdminByOrgId(request, orgId);
    if (auth.ok === false) return auth.response;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        treasuryMint: null,
        treasuryAccount: null,
        elGamalPubKey: null,
        encryptedElGamalKey: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Treasury configuration removed',
    });
  } catch (error) {
    logger.error({ error }, 'Error removing treasury');
    return NextResponse.json(
      { error: 'Failed to remove treasury' },
      { status: 500 }
    );
  }
}
