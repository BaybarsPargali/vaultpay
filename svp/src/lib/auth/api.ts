import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

import prisma from '@/lib/db/prisma';

import { VaultPayAuthHeaders } from './constants';
import { verifyVaultPaySessionToken } from './jwt';

const MAX_SKEW_MS = 5 * 60 * 1000;

export interface WalletAuthOk {
  ok: true;
  wallet: string;
}

export interface WalletAuthErr {
  ok: false;
  response: NextResponse;
}

export type WalletAuthResult = WalletAuthOk | WalletAuthErr;

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function unauthorized(message: string, status: number = 401): WalletAuthErr {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status }),
  };
}

export async function requireWalletAuth(request: NextRequest): Promise<WalletAuthResult> {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      return unauthorized('Missing session token');
    }

    try {
      const claims = await verifyVaultPaySessionToken(token);
      return { ok: true, wallet: claims.wallet };
    } catch {
      return unauthorized('Invalid session token');
    }
  }

  const wallet = request.headers.get(VaultPayAuthHeaders.wallet);
  const timestampRaw = request.headers.get(VaultPayAuthHeaders.timestamp);
  const bodyShaHeader = request.headers.get(VaultPayAuthHeaders.bodySha256);
  const signatureB64 = request.headers.get(VaultPayAuthHeaders.signature);

  if (!wallet || !timestampRaw || !bodyShaHeader || !signatureB64) {
    return unauthorized('Missing VaultPay auth headers');
  }

  let timestamp: number;
  try {
    timestamp = Number(timestampRaw);
    if (!Number.isFinite(timestamp)) throw new Error('bad');
  } catch {
    return unauthorized('Invalid VaultPay auth timestamp');
  }

  const skew = Math.abs(Date.now() - timestamp);
  if (skew > MAX_SKEW_MS) {
    return unauthorized('VaultPay auth timestamp outside allowed window', 401);
  }

  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = new PublicKey(wallet).toBytes();
  } catch {
    return unauthorized('Invalid wallet public key');
  }

  const requestPath = request.nextUrl.pathname + request.nextUrl.search;

  // Read body without consuming it for downstream code
  const rawBody = await request.clone().text();
  const bodySha = sha256Hex(rawBody);
  if (bodySha !== bodyShaHeader) {
    return unauthorized('VaultPay auth body hash mismatch', 401);
  }

  const message = `${timestamp}.${request.method.toUpperCase()}.${requestPath}.${bodySha}`;
  const messageBytes = new TextEncoder().encode(message);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = Buffer.from(signatureB64, 'base64');
  } catch {
    return unauthorized('Invalid VaultPay auth signature encoding');
  }

  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  if (!valid) {
    return unauthorized('Invalid VaultPay auth signature', 401);
  }

  return { ok: true, wallet };
}

export async function requireOrgAdminByOrgId(
  request: NextRequest,
  orgId: string
): Promise<({ ok: true; wallet: string } | WalletAuthErr)> {
  const auth = await requireWalletAuth(request);
  if (!auth.ok) return auth;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Organization not found' }, { status: 404 }),
    };
  }

  if (org.adminWallet !== auth.wallet) {
    return unauthorized('Forbidden', 403);
  }

  return { ok: true, wallet: auth.wallet };
}

export async function requireOrgAdminByPayeeId(
  request: NextRequest,
  payeeId: string
): Promise<({ ok: true; wallet: string; orgId: string } | WalletAuthErr)> {
  const payee = await prisma.payee.findUnique({ where: { id: payeeId } });
  if (!payee) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Payee not found' }, { status: 404 }),
    };
  }

  const auth = await requireOrgAdminByOrgId(request, payee.orgId);
  if (!auth.ok) return auth as WalletAuthErr;

  return { ok: true, wallet: auth.wallet, orgId: payee.orgId };
}

export async function requireOrgAdminByPaymentId(
  request: NextRequest,
  paymentId: string
): Promise<({ ok: true; wallet: string; orgId: string } | WalletAuthErr)> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Payment not found' }, { status: 404 }),
    };
  }

  const auth = await requireOrgAdminByOrgId(request, payment.orgId);
  if (!auth.ok) return auth as WalletAuthErr;

  return { ok: true, wallet: auth.wallet, orgId: payment.orgId };
}

