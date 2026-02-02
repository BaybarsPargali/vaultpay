// src/lib/privacy-cash/types.ts
// Privacy Cash SDK Type Definitions with Arcium MPC Support

import { Connection, PublicKey } from '@solana/web3.js';

// Pool denomination sizes in SOL
export const POOL_SIZES = {
  SMALL: 0.1,    // 0.1 SOL
  MEDIUM: 1,     // 1 SOL
  LARGE: 10,     // 10 SOL
  WHALE: 100,    // 100 SOL
} as const;

export type PoolSize = typeof POOL_SIZES[keyof typeof POOL_SIZES];

export interface PrivacyCashConfig {
  connection: Connection;
  programId?: PublicKey;
}

/**
 * Encrypted payload from Arcium MPC encryption
 */
export interface EncryptedPayload {
  ciphertext: Uint8Array;
  publicKey: Uint8Array;
  nonce: Buffer;
}

/**
 * Batch encrypted payments for payroll
 */
export interface BatchEncryptedPayload {
  payments: Array<{
    recipient: string;
    ciphertext: Uint8Array;
    nonce: Buffer;
  }>;
  publicKey: Uint8Array;
  totalPayments: number;
}

export interface DepositResult {
  signature: string;
  commitment: string;
  nullifierHash: string;
  amount: number;
  encryptedPayload?: EncryptedPayload;
}

export interface WithdrawResult {
  signature: string;
  recipient: string;
  amount: number;
}

export interface PrivateTransferResult {
  depositSignature: string;
  withdrawSignature: string;
  stealthAddress: string;
  amount: number;
  success: boolean;
  encryptedPayload?: EncryptedPayload;
}

export interface PoolStats {
  totalDeposits: number;
  totalWithdrawals: number;
  currentAnonymitySet: number;
}
