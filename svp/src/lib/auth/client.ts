'use client';

import { PublicKey } from '@solana/web3.js';

import { VaultPayAuthHeaders } from './constants';

type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export interface BuildAuthHeadersInput {
  publicKey: PublicKey;
  signMessage: SignMessageFn;
  method: string;
  pathWithQuery: string;
  bodyText?: string;
}

export async function buildVaultPayAuthHeaders(input: BuildAuthHeadersInput): Promise<Record<string, string>> {
  const { publicKey, signMessage, method, pathWithQuery, bodyText } = input;
  const timestamp = Date.now();
  const rawBody = bodyText ?? '';

  const bodySha = await sha256Hex(rawBody);
  const message = `${timestamp}.${method.toUpperCase()}.${pathWithQuery}.${bodySha}`;
  const messageBytes = new TextEncoder().encode(message);

  const signature = await signMessage(messageBytes);

  return {
    [VaultPayAuthHeaders.wallet]: publicKey.toBase58(),
    [VaultPayAuthHeaders.timestamp]: String(timestamp),
    [VaultPayAuthHeaders.bodySha256]: bodySha,
    [VaultPayAuthHeaders.signature]: toBase64(signature),
  };
}
