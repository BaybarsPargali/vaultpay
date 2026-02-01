// src/lib/token2022/types.ts
// Types for Token-2022 Confidential Transfers

import { PublicKey } from '@solana/web3.js';

/**
 * ElGamal public key for confidential transfers
 */
export interface ElGamalPublicKey {
  bytes: Uint8Array; // 32 bytes
}

/**
 * ElGamal keypair for encryption/decryption
 */
export interface ElGamalKeypair {
  publicKey: ElGamalPublicKey;
  secretKey: Uint8Array; // 32 bytes
}

/**
 * ElGamal ciphertext (encrypted amount)
 */
export interface ElGamalCiphertext {
  commitment: Uint8Array; // 32 bytes
  handle: Uint8Array; // 32 bytes
}

/**
 * Confidential treasury configuration
 */
export interface ConfidentialTreasuryConfig {
  mint: PublicKey;
  account?: PublicKey;
  elGamalPubkey?: ElGamalPublicKey;
  auditorElGamalPubkey?: ElGamalPublicKey;
  autoApproveNewAccounts?: boolean;
  createdAt?: Date;
}

/**
 * Confidential balance (decrypted for authorized users)
 */
export interface ConfidentialBalance {
  available: bigint;
  pending: bigint;
  total: bigint;
  lastUpdated: Date;
}

/**
 * Result of a confidential deposit
 */
export interface ConfidentialDepositResult {
  signature: string;
  amount: number;
  pendingBalance: bigint;
}

/**
 * Result of a confidential transfer
 */
export interface ConfidentialTransferResult {
  signature: string;
  amount: number;
  recipientAccount: PublicKey;
}

/**
 * Token types supported for confidential transfers
 */
export type ConfidentialToken = 'SOL' | 'USDC' | 'USDT';

/**
 * Mint addresses for confidential tokens
 */
export const CONFIDENTIAL_TOKEN_MINTS: Record<ConfidentialToken, string> = {
  SOL: process.env.NEXT_PUBLIC_WSOL_MINT || 'So11111111111111111111111111111111111111112',
  USDC: process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: process.env.NEXT_PUBLIC_USDT_MINT || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

/**
 * Token-2022 Program ID
 */
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_2022_PROGRAM || 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
);
