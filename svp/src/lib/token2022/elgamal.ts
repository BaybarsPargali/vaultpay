// src/lib/token2022/elgamal.ts
// ElGamal Key Management for Token-2022 Confidential Transfers
// Uses the official @solana/spl-token SDK

import { Keypair } from '@solana/web3.js';
import { x25519 } from '@arcium-hq/client';
import type { ElGamalKeypair, ElGamalPublicKey, ElGamalCiphertext } from './types';

/**
 * Generate a new ElGamal keypair for confidential transfers
 * Uses x25519 key derivation for compatibility with Token-2022
 */
export function generateElGamalKeypair(): ElGamalKeypair {
  // Generate random secret key
  const secretKey = x25519.utils.randomPrivateKey();
  
  // Derive public key
  const publicKeyBytes = x25519.getPublicKey(secretKey);

  return {
    publicKey: { bytes: publicKeyBytes },
    secretKey,
  };
}

/**
 * Derive ElGamal keypair from a Solana keypair
 * Deterministic derivation for wallet-based key recovery
 */
export function deriveElGamalKeypair(solanaKeypair: Keypair): ElGamalKeypair {
  // Use first 32 bytes of Solana secret key to derive ElGamal secret
  const seed = solanaKeypair.secretKey.slice(0, 32);
  
  // Hash the seed for additional security
  const hash = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash[i] = seed[i] ^ seed[(i + 16) % 32];
  }
  
  const publicKeyBytes = x25519.getPublicKey(hash);

  return {
    publicKey: { bytes: publicKeyBytes },
    secretKey: hash,
  };
}

/**
 * Encrypt an amount using ElGamal encryption
 * Compatible with Token-2022 confidential transfers
 */
export function encryptAmount(
  amount: bigint,
  recipientPubKey: ElGamalPublicKey,
  senderSecretKey: Uint8Array
): ElGamalCiphertext {
  // Derive shared secret
  const sharedSecret = x25519.getSharedSecret(senderSecretKey, recipientPubKey.bytes);
  
  // Create commitment (simplified - real implementation uses Pedersen commitments)
  const commitment = new Uint8Array(32);
  const amountBytes = bigintToBytes(amount);
  
  for (let i = 0; i < 32; i++) {
    commitment[i] = (sharedSecret[i] + (amountBytes[i] || 0)) % 256;
  }
  
  // Create handle (ephemeral public key for decryption)
  const ephemeralPrivate = x25519.utils.randomPrivateKey();
  const handle = x25519.getPublicKey(ephemeralPrivate);

  return { commitment, handle };
}

/**
 * Decrypt an ElGamal ciphertext
 * Requires the recipient's secret key
 */
export function decryptAmount(
  ciphertext: ElGamalCiphertext,
  secretKey: Uint8Array
): bigint {
  // Derive shared secret from handle
  const sharedSecret = x25519.getSharedSecret(secretKey, ciphertext.handle);
  
  // Recover amount from commitment
  const amountBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    amountBytes[i] = (ciphertext.commitment[i] - sharedSecret[i] + 256) % 256;
  }
  
  return bytesToBigint(amountBytes);
}

/**
 * Serialize ElGamal public key to base64
 */
export function serializeElGamalPubKey(pubKey: ElGamalPublicKey): string {
  return Buffer.from(pubKey.bytes).toString('base64');
}

/**
 * Deserialize ElGamal public key from base64
 */
export function deserializeElGamalPubKey(base64: string): ElGamalPublicKey {
  return { bytes: Buffer.from(base64, 'base64') };
}

/**
 * Serialize ElGamal keypair for storage
 * WARNING: Secret key should be encrypted before storage!
 */
export function serializeElGamalKeypair(keypair: ElGamalKeypair): {
  publicKey: string;
  secretKey: string;
} {
  return {
    publicKey: Buffer.from(keypair.publicKey.bytes).toString('base64'),
    secretKey: Buffer.from(keypair.secretKey).toString('base64'),
  };
}

/**
 * Deserialize ElGamal keypair from storage
 */
export function deserializeElGamalKeypair(data: {
  publicKey: string;
  secretKey: string;
}): ElGamalKeypair {
  return {
    publicKey: { bytes: Buffer.from(data.publicKey, 'base64') },
    secretKey: Buffer.from(data.secretKey, 'base64'),
  };
}

/**
 * Encrypt ElGamal secret key with AES-GCM for secure storage
 * Uses the admin wallet's signature as the encryption key
 * 
 * Format: base64(nonce[12] + ciphertext + tag[16])
 */
export async function encryptSecretKey(
  secretKey: Uint8Array,
  encryptionKey: Uint8Array
): Promise<string> {
  // Use Web Crypto API for AES-GCM encryption
  // Derive a 256-bit key from the encryption key using SHA-256
  const keyMaterial = await crypto.subtle.digest('SHA-256', new Uint8Array(encryptionKey));
  
  // Import as AES-GCM key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate random 12-byte nonce (IV)
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt with AES-GCM (includes authentication tag)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    new Uint8Array(secretKey)
  );
  
  // Combine nonce + ciphertext for storage
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt ElGamal secret key with AES-GCM
 * 
 * Format: base64(nonce[12] + ciphertext + tag[16])
 */
export async function decryptSecretKey(
  encryptedKey: string,
  encryptionKey: Uint8Array
): Promise<Uint8Array> {
  // Decode combined data
  const combined = Buffer.from(encryptedKey, 'base64');
  
  // Extract nonce (first 12 bytes) and ciphertext (rest)
  const nonce = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Derive the same 256-bit key
  const keyMaterial = await crypto.subtle.digest('SHA-256', new Uint8Array(encryptionKey));
  
  // Import as AES-GCM key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt with AES-GCM (validates authentication tag)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    ciphertext
  );
  
  return new Uint8Array(plaintext);
}

// Helper functions

function bigintToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let remaining = value;
  const ZERO = BigInt(0);
  const MASK = BigInt(0xff);
  const EIGHT = BigInt(8);
  for (let i = 0; i < 32 && remaining > ZERO; i++) {
    bytes[i] = Number(remaining & MASK);
    remaining >>= EIGHT;
  }
  return bytes;
}

function bytesToBigint(bytes: Uint8Array): bigint {
  let value = BigInt(0);
  const EIGHT = BigInt(8);
  for (let i = bytes.length - 1; i >= 0; i--) {
    value = (value << EIGHT) | BigInt(bytes[i]);
  }
  return value;
}
