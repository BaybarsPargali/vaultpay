// src/app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireWalletAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/organizations - Get organization by wallet
export async function GET(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.ok === false) return auth.response;

    const wallet = request.nextUrl.searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Prevent leaking org existence across wallets
    if (wallet !== auth.wallet) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: wallet },
    });

    // Return null if no organization found (not an error)
    return NextResponse.json({ organization: organization || null });
  } catch (error) {
    logger.error({ error }, 'Error fetching organization');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create new organization
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.ok === false) return auth.response;

    const body = await request.json();
    const { name, adminWallet } = body;

    if (!name || !adminWallet) {
      return NextResponse.json(
        { error: 'Name and adminWallet are required' },
        { status: 400 }
      );
    }

    if (adminWallet !== auth.wallet) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if organization already exists for this wallet
    const existing = await prisma.organization.findUnique({
      where: { adminWallet },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Organization already exists for this wallet' },
        { status: 409 }
      );
    }

    // Create new organization
    const organization = await prisma.organization.create({
      data: {
        name,
        adminWallet,
      },
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Error creating organization');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations - Update organization settings
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.ok === false) return auth.response;

    const body = await request.json();
    const { 
      orgId, 
      name, 
      auditorPubkey, 
      auditorName,
      treasuryMint,
      treasuryAccount,
      elGamalPubKey,
      encryptedElGamalKey,
    } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify the caller is the org admin
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (org.adminWallet !== auth.wallet) {
      return NextResponse.json(
        { error: 'Only the organization admin can update settings' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name;
    if (treasuryMint !== undefined) updateData.treasuryMint = treasuryMint;
    if (treasuryAccount !== undefined) updateData.treasuryAccount = treasuryAccount;
    if (elGamalPubKey !== undefined) updateData.elGamalPubKey = elGamalPubKey;
    if (encryptedElGamalKey !== undefined) updateData.encryptedElGamalKey = encryptedElGamalKey;

    // Handle auditor configuration
    if (auditorPubkey !== undefined) {
      // Validate auditor pubkey format (base64-encoded 32-byte x25519 key)
      if (auditorPubkey !== null && auditorPubkey !== '') {
        try {
          const decoded = Buffer.from(auditorPubkey, 'base64');
          if (decoded.length !== 32) {
            return NextResponse.json(
              { error: 'Auditor public key must be a 32-byte x25519 key (base64-encoded)' },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid auditor public key format (must be base64)' },
            { status: 400 }
          );
        }
        updateData.auditorPubkey = auditorPubkey;
        updateData.auditorName = auditorName || 'Compliance Auditor';
        updateData.auditorConfiguredAt = new Date();
      } else {
        // Clear auditor configuration
        updateData.auditorPubkey = null;
        updateData.auditorName = null;
        updateData.auditorConfiguredAt = null;
      }
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return NextResponse.json({ 
      organization: updated,
      message: auditorPubkey ? 'Auditor configured successfully' : 'Organization updated',
    });
  } catch (error) {
    logger.error({ error }, 'Error updating organization');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}