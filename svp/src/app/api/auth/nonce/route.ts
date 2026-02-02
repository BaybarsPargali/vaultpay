import { NextResponse } from 'next/server';
import crypto from 'crypto';

const NONCE_COOKIE = 'vp_auth_nonce';
const NONCE_TTL_SECONDS = 5 * 60;

export async function GET() {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + NONCE_TTL_SECONDS * 1000).toISOString();

  const response = NextResponse.json({ nonce, issuedAt, expiresAt });

  response.cookies.set({
    name: NONCE_COOKIE,
    value: nonce,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: NONCE_TTL_SECONDS,
    path: '/',
  });

  return response;
}
