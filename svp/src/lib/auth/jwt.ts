import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'vaultpay';
const AUDIENCE = 'vaultpay';

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export interface VaultPaySessionClaims {
  wallet: string;
  expiresAt: string;
}

export async function signVaultPaySessionToken(wallet: string, ttlSeconds: number = 60 * 60 * 24): Promise<string> {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('AUTH_JWT_SECRET not configured');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + ttlSeconds;

  return new SignJWT({ wallet })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifyVaultPaySessionToken(token: string): Promise<VaultPaySessionClaims> {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('AUTH_JWT_SECRET not configured');
  }

  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const wallet = payload.wallet;
  if (typeof wallet !== 'string' || wallet.length === 0) {
    throw new Error('Invalid token payload');
  }

  const exp = payload.exp;
  if (typeof exp !== 'number') {
    throw new Error('Invalid token expiration');
  }

  return {
    wallet,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}
