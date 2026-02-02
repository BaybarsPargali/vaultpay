import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { logger } from '@/lib/logger';

import { buildVaultPaySignInMessage } from '@/lib/auth/signin-message';
import { signVaultPaySessionToken } from '@/lib/auth/jwt';

const NONCE_COOKIE = 'vp_auth_nonce';
const MAX_SKEW_MS = 5 * 60 * 1000;

interface LoginBody {
  wallet: string;
  nonce: string;
  issuedAt: string;
  signature: string; // base64
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const configured = Boolean(process.env.AUTH_JWT_SECRET);
    if (!configured) {
      return NextResponse.json(
        { error: 'Session auth not configured', hint: 'Set AUTH_JWT_SECRET' },
        { status: 500 }
      );
    }

    let body: LoginBody;
    try {
      body = (await request.json()) as LoginBody;
    } catch {
      return badRequest('Invalid JSON');
    }

    if (!body.wallet || !body.nonce || !body.issuedAt || !body.signature) {
      return badRequest('Missing required fields');
    }

    const cookieNonce = request.cookies.get(NONCE_COOKIE)?.value;
    if (!cookieNonce) {
      return NextResponse.json({ error: 'Missing auth nonce cookie' }, { status: 401 });
    }

    if (cookieNonce !== body.nonce) {
      return NextResponse.json({ error: 'Auth nonce mismatch' }, { status: 401 });
    }

    const issuedAtMs = Date.parse(body.issuedAt);
    if (!Number.isFinite(issuedAtMs)) {
      return badRequest('Invalid issuedAt');
    }

    const skew = Math.abs(Date.now() - issuedAtMs);
    if (skew > MAX_SKEW_MS) {
      return NextResponse.json({ error: 'Auth timestamp outside allowed window' }, { status: 401 });
    }

    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = new PublicKey(body.wallet).toBytes();
    } catch {
      return badRequest('Invalid wallet public key');
    }

    const message = buildVaultPaySignInMessage({
      wallet: body.wallet,
      nonce: body.nonce,
      issuedAt: body.issuedAt,
    });
    const messageBytes = new TextEncoder().encode(message);

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = Buffer.from(body.signature, 'base64');
    } catch {
      return badRequest('Invalid signature encoding');
    }

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const token = await signVaultPaySessionToken(body.wallet);

    const response = NextResponse.json({
      token,
      wallet: body.wallet,
      expiresInSeconds: 60 * 60 * 24,
    });

    // One-time nonce: clear cookie after successful login
    response.cookies.set({
      name: NONCE_COOKIE,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error({ error }, 'Auth login error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
