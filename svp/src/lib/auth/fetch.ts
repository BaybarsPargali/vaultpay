'use client';

import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';

import { buildVaultPayAuthHeaders } from './client';
import { buildVaultPaySignInMessage } from './signin-message';

export type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

export interface VaultPayFetchAuth {
  publicKey: PublicKey | null;
  signMessage: SignMessageFn | undefined;
}

interface StoredSession {
  wallet: string;
  token: string;
  expiresAtMs: number;
}

const SESSION_KEY = 'vaultpay.session.v1';

interface BufferedResponse {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: ArrayBuffer;
}

const inFlightGetRequests = new Map<string, Promise<BufferedResponse>>();

const ENABLE_DEV_GET_CACHE = process.env.NODE_ENV !== 'production';
const DEV_GET_CACHE_TTL_MS = 1000;

const recentGetCache = new Map<
  string,
  {
    expiresAtMs: number;
    response: BufferedResponse;
  }
>();

function getAuthIdentity(headers: Headers): string {
  return (
    headers.get('authorization') ??
    headers.get('x-vaultpay-wallet') ??
    headers.get('x-vaultpay-signature') ??
    ''
  );
}

function buildInFlightKey(method: string, url: string, headers: Headers): string {
  return `${method.toUpperCase()} ${url} :: ${getAuthIdentity(headers)}`;
}

async function fetchGetWithDedupe(url: string, init: RequestInit, headers: Headers): Promise<Response> {
  const key = buildInFlightKey('GET', url, headers);

  if (ENABLE_DEV_GET_CACHE) {
    const cached = recentGetCache.get(key);
    if (cached && Date.now() < cached.expiresAtMs) {
      return new Response(cached.response.body.slice(0), {
        status: cached.response.status,
        statusText: cached.response.statusText,
        headers: cached.response.headers,
      });
    }
  }

  const existing = inFlightGetRequests.get(key);
  if (existing) {
    const buffered = await existing;
    return new Response(buffered.body.slice(0), {
      status: buffered.status,
      statusText: buffered.statusText,
      headers: buffered.headers,
    });
  }

  const promise = (async (): Promise<BufferedResponse> => {
    const res = await fetch(url, { ...init, headers });
    const body = await res.arrayBuffer();
    return {
      status: res.status,
      statusText: res.statusText,
      headers: Array.from(res.headers.entries()),
      body,
    };
  })();

  inFlightGetRequests.set(key, promise);
  try {
    const buffered = await promise;

    if (ENABLE_DEV_GET_CACHE && buffered.status !== 401) {
      recentGetCache.set(key, {
        expiresAtMs: Date.now() + DEV_GET_CACHE_TTL_MS,
        response: buffered,
      });
    }

    return new Response(buffered.body.slice(0), {
      status: buffered.status,
      statusText: buffered.statusText,
      headers: buffered.headers,
    });
  } finally {
    inFlightGetRequests.delete(key);
  }
}

let inFlightSession:
  | {
      wallet: string;
      promise: Promise<string | null>;
    }
  | null = null;

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.token || !parsed.wallet || !parsed.expiresAtMs) return null;
    if (Date.now() >= parsed.expiresAtMs) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setStoredSession(session: StoredSession) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

async function ensureSession(auth: VaultPayFetchAuth): Promise<string | null> {
  if (!auth.publicKey) throw new Error('Wallet not connected');
  const wallet = auth.publicKey.toBase58();

  if (inFlightSession?.wallet === wallet) {
    return inFlightSession.promise;
  }

  const existing = getStoredSession();
  if (existing && existing.wallet === wallet) {
    return existing.token;
  }

  if (!auth.signMessage) {
    throw new Error('Wallet does not support message signing');
  }

  const promise = (async () => {
    const nonceRes = await fetch('/api/auth/nonce', { method: 'GET' });
    if (!nonceRes.ok) {
      return null;
    }
    const { nonce, issuedAt, expiresAt } = (await nonceRes.json()) as {
      nonce: string;
      issuedAt: string;
      expiresAt: string;
    };

    const message = buildVaultPaySignInMessage({ wallet, nonce, issuedAt });
    const messageBytes = new TextEncoder().encode(message);

    const loadingToast = toast.loading('Sign once to authenticate VaultPay…');
    try {
      const signatureBytes = await auth.signMessage(messageBytes);
      const signature = btoa(String.fromCharCode(...signatureBytes));

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, nonce, issuedAt, signature }),
      });

      if (!loginRes.ok) {
        return null;
      }

      const data = (await loginRes.json()) as {
        token: string;
        expiresInSeconds: number;
        wallet: string;
      };

      const expiresAtMs = Date.parse(expiresAt);
      setStoredSession({
        wallet,
        token: data.token,
        expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + data.expiresInSeconds * 1000,
      });
      toast.success('Authenticated');
      return data.token;
    } finally {
      toast.dismiss(loadingToast);
    }
  })();

  inFlightSession = { wallet, promise };
  try {
    return await promise;
  } finally {
    if (inFlightSession?.wallet === wallet) {
      inFlightSession = null;
    }
  }
}

export async function vaultPayFetch(
  auth: VaultPayFetchAuth,
  pathWithQuery: string,
  init: RequestInit = {}
): Promise<Response> {
  if (!auth.publicKey) {
    throw new Error('Wallet not connected');
  }

  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();

  // Preferred: session-based auth (one signature per session)
  const sessionToken = await ensureSession(auth);
  if (sessionToken) {
    headers.set('authorization', `Bearer ${sessionToken}`);
    if (typeof init.body === 'string' && init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res =
      method === 'GET' && !init.body && !init.signal
        ? await fetchGetWithDedupe(pathWithQuery, init, headers)
        : await fetch(pathWithQuery, {
            ...init,
            headers,
          });

    // Token may have expired or been invalidated; retry once.
    if (res.status === 401) {
      clearStoredSession();
      const refreshedToken = await ensureSession(auth);
      if (refreshedToken) {
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set('authorization', `Bearer ${refreshedToken}`);
        if (typeof init.body === 'string' && init.body && !retryHeaders.has('Content-Type')) {
          retryHeaders.set('Content-Type', 'application/json');
        }
        return method === 'GET' && !init.body && !init.signal
          ? fetchGetWithDedupe(pathWithQuery, init, retryHeaders)
          : fetch(pathWithQuery, {
              ...init,
              headers: retryHeaders,
            });
      }
    }

    return res;
  }

  // Fallback: legacy per-request signatures (if session auth not configured)
  if (!auth.signMessage) {
    throw new Error('Wallet does not support message signing');
  }

  const bodyText = typeof init.body === 'string' ? init.body : '';

  const authHeaders = await buildVaultPayAuthHeaders({
    publicKey: auth.publicKey,
    signMessage: auth.signMessage,
    method,
    pathWithQuery,
    bodyText: bodyText || undefined,
  });

  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }

  if (bodyText && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (method === 'GET' && !init.body && !init.signal) {
    return fetchGetWithDedupe(pathWithQuery, init, headers);
  }

  return fetch(pathWithQuery, {
    ...init,
    headers,
  });
}
