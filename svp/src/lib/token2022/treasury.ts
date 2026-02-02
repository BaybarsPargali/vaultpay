// src/lib/token2022/treasury.ts
// Token-2022 Treasury Management
// Implements Token-2022 token operations for treasury management
// NOTE: Full confidential transfers require native Solana implementation

import {
  Connection,
  PublicKey,
  Keypair,
} from '@solana/web3.js';
import {
  createMint,
  mintTo,
  getAccount,
  transfer,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import { connection } from '../solana/connection';
import {
  generateElGamalKeypair,
  serializeElGamalKeypair,
  deserializeElGamalKeypair,
  encryptSecretKey,
  decryptSecretKey,
} from './elgamal';
import type {
  ElGamalKeypair,
  ConfidentialTreasuryConfig,
  ConfidentialToken,
} from './types';
import { CONFIDENTIAL_TOKEN_MINTS } from './types';

/**
 * Token-2022 Treasury Manager
 * Handles creation and management of Token-2022 treasuries
 * 
 * NOTE: Full confidential transfers are a Token-2022 extension that requires
 * specific native implementation. This module provides the foundation for
 * Token-2022 treasury operations with simulated confidential tracking.
 */
export class ConfidentialTreasury {
  private connection: Connection;
  private elGamalKeypair?: ElGamalKeypair;

  constructor(conn?: Connection) {
    this.connection = conn || connection;
  }

  /**
   * Initialize the treasury with an ElGamal keypair
   * The keypair is used for encrypting/decrypting treasury balances locally
   */
  async initialize(existingKeypair?: ElGamalKeypair): Promise<ElGamalKeypair> {
    if (existingKeypair) {
      this.elGamalKeypair = existingKeypair;
    } else {
      this.elGamalKeypair = generateElGamalKeypair();
    }
    return this.elGamalKeypair;
  }

  /**
   * Get the ElGamal keypair for external use
   */
  getElGamalKeypair(): ElGamalKeypair | undefined {
    return this.elGamalKeypair;
  }

  /**
   * Create a new Token-2022 mint for treasury operations
   * This creates a standard Token-2022 mint (confidential extension would require native impl)
   */
  async createTreasuryMint(
    payer: Keypair,
    mintAuthority: PublicKey,
    freezeAuthority?: PublicKey,
    decimals: number = 9
  ): Promise<{
    mint: PublicKey;
    config: Partial<ConfidentialTreasuryConfig>;
  }> {
    if (!this.elGamalKeypair) {
      await this.initialize();
    }

    // Create Token-2022 mint
    const mint = await createMint(
      this.connection,
      payer,
      mintAuthority,
      freezeAuthority || null,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('[Treasury] Created Token-2022 mint:', mint.toBase58());

    return {
      mint,
      config: {
        mint,
        elGamalPubkey: this.elGamalKeypair!.publicKey,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Create a treasury token account for an organization
   */
  async createTreasuryAccount(
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey
  ): Promise<PublicKey> {
    const account = await getOrCreateAssociatedTokenAccount(
      this.connection,
      payer,
      mint,
      owner,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('[Treasury] Created treasury account:', account.address.toBase58());
    return account.address;
  }

  /**
   * Get the associated token address for a wallet
   */
  getTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
    return getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );
  }

  /**
   * Get the balance of a treasury account
   * Returns both raw and formatted balances
   */
  async getBalance(tokenAccount: PublicKey, decimals: number = 9): Promise<{
    raw: bigint;
    formatted: number;
  }> {
    try {
      const account = await getAccount(
        this.connection,
        tokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const raw = account.amount;
      const formatted = Number(raw) / Math.pow(10, decimals);

      return { raw, formatted };
    } catch (error) {
      console.error('[Treasury] Error getting balance:', error);
      return { raw: BigInt(0), formatted: 0 };
    }
  }

  /**
   * Build a transaction to create an associated token account
   * Returns the instruction to add to a transaction
   */
  buildCreateAccountInstruction(
    payer: PublicKey,
    mint: PublicKey,
    owner: PublicKey
  ): { instruction: ReturnType<typeof createAssociatedTokenAccountInstruction>; address: PublicKey } {
    const address = this.getTokenAddress(mint, owner);
    
    const instruction = createAssociatedTokenAccountInstruction(
      payer,
      address,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID
    );

    return { instruction, address };
  }

  /**
   * Transfer tokens from treasury
   * This is a standard Token-2022 transfer (not confidential)
   */
  async transferFromTreasury(
    payer: Keypair,
    from: PublicKey,
    to: PublicKey,
    owner: PublicKey | Keypair,
    amount: bigint
  ): Promise<string> {
    const signature = await transfer(
      this.connection,
      payer,
      from,
      to,
      owner,
      amount,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('[Treasury] Transfer completed:', signature);
    return signature;
  }

  /**
   * Mint tokens to a treasury account (for testing/setup)
   */
  async mintToTreasury(
    payer: Keypair,
    mint: PublicKey,
    destination: PublicKey,
    mintAuthority: PublicKey | Keypair,
    amount: bigint
  ): Promise<string> {
    const signature = await mintTo(
      this.connection,
      payer,
      mint,
      destination,
      mintAuthority,
      amount,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('[Treasury] Minted tokens:', signature);
    return signature;
  }

  /**
   * Serialize the ElGamal keypair for secure storage
   */
  serializeKeypair(): { publicKey: string; secretKey: string } | null {
    if (!this.elGamalKeypair) return null;
    return serializeElGamalKeypair(this.elGamalKeypair);
  }

  /**
   * Load an ElGamal keypair from serialized form
   */
  loadKeypair(serialized: { publicKey: string; secretKey: string }): ElGamalKeypair {
    this.elGamalKeypair = deserializeElGamalKeypair(serialized);
    return this.elGamalKeypair;
  }

  /**
   * Encrypt the ElGamal secret key for secure storage
   */
  async encryptKeypairForStorage(encryptionKey: Uint8Array): Promise<string | null> {
    if (!this.elGamalKeypair) return null;
    return await encryptSecretKey(this.elGamalKeypair.secretKey, encryptionKey);
  }

  /**
   * Decrypt the ElGamal secret key from storage
   */
  async decryptKeypairFromStorage(
    encrypted: string,
    encryptionKey: Uint8Array
  ): Promise<Uint8Array> {
    return await decryptSecretKey(encrypted, encryptionKey);
  }

  /**
   * Get supported confidential token mints
   */
  getSupportedMints(): Record<ConfidentialToken, string> {
    return CONFIDENTIAL_TOKEN_MINTS;
  }

  /**
   * Check if a mint is a supported confidential token
   */
  isSupportedMint(mint: string): boolean {
    return Object.values(CONFIDENTIAL_TOKEN_MINTS).includes(mint);
  }
}

// Singleton instance
export const confidentialTreasury = new ConfidentialTreasury();

/**
 * Helper to create a simple treasury setup
 */
export async function setupTreasuryForOrg(
  payer: Keypair,
  orgWallet: PublicKey
): Promise<{
  mint: PublicKey;
  treasuryAccount: PublicKey;
  elGamalKeypair: ElGamalKeypair;
}> {
  const treasury = new ConfidentialTreasury();
  const elGamalKeypair = await treasury.initialize();

  const { mint } = await treasury.createTreasuryMint(
    payer,
    orgWallet,
    orgWallet
  );

  const treasuryAccount = await treasury.createTreasuryAccount(
    payer,
    mint,
    orgWallet
  );

  return {
    mint,
    treasuryAccount,
    elGamalKeypair,
  };
}
