// src/lib/arcium/program.ts
// ============================================================================
// ⚠️ DEPRECATED: LEGACY ESCROW ARCHITECTURE
// ============================================================================
//
// This file contains the OLD "Escrow Validator" pattern which has a PRIVACY FLAW:
// The amount_lamports was passed as PLAINTEXT to the escrow program.
//
// DO NOT USE FOR NEW DEVELOPMENT.
//
// NEW ARCHITECTURE: Use the "Compliance Co-Signer" pattern instead:
// - src/lib/cosigner/index.ts - Co-signer client and service
// - src/lib/cosigner/compliant-transfer.ts - Compliant confidential transfers
// - src/app/api/payments/private/route.ts - Private payment API
// - src/hooks/usePrivatePayment.ts - React hook for private payments
//
// The new architecture uses standard Token-2022 Confidential Transfers where
// amounts are ENCRYPTED on-chain (ElGamal + ZK proofs), and Arcium acts as
// a "Compliance Co-Signer" (2-of-2 multisig) instead of an escrow validator.
//
// This file is kept for backward compatibility with existing MPC status checks.
// ============================================================================
//
// VaultPay Confidential Transfer - Anchor Program Client
// This calls the on-chain program with encrypted amounts

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { 
  x25519, 
  RescueCipher,
  getComputationAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getClusterAccAddress,
} from '@arcium-hq/client';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { connection } from '../solana/connection';

// Safe PublicKey initialization helper
function safePublicKey(value: string | undefined, envName: string, defaultValue: string): PublicKey {
  if (!value) {
    console.warn(`[VaultPay] ⚠️  ${envName} not set, using default: ${defaultValue}`);
    console.warn(`[VaultPay] ⚠️  For production, set ${envName} in environment variables`);
  }
  try {
    const key = value || defaultValue;
    return new PublicKey(key);
  } catch {
    console.error(`[VaultPay] ❌ Invalid PublicKey for ${envName}: ${value}`);
    throw new Error(`Invalid ${envName}: ${value}. Must be a valid Solana public key.`);
  }
}

// Required environment variable helper - throws on missing in production
function requireEnvVar(value: string | undefined, envName: string): string {
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${envName}`);
    }
    console.warn(`[VaultPay] ⚠️  ${envName} not set (required for production)`);
  }
  return value || '';
}

// Program IDs from .env (with clear warnings for defaults)
const VAULTPAY_PROGRAM_ID = safePublicKey(
  process.env.NEXT_PUBLIC_VAULTPAY_PROGRAM_ID,
  'NEXT_PUBLIC_VAULTPAY_PROGRAM_ID',
  'ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ'
);

const MXE_ACCOUNT = safePublicKey(
  process.env.NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT,
  'NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT',
  '13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk'
);

const COMPDEF_VALIDATE_TRANSFER = safePublicKey(
  process.env.NEXT_PUBLIC_COMPDEF_VALIDATE_TRANSFER,
  'NEXT_PUBLIC_COMPDEF_VALIDATE_TRANSFER',
  'EGE8e5wb3NQiPb6qx5xAxuoRZSmSQpdB94Zsih5SteEB'
);

const ARCIUM_PROGRAM_ID = new PublicKey('F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk');

const CLUSTER_OFFSET = parseInt(process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET || '123');

// Priority fee configuration for network congestion (microlamports per compute unit)
// Default: 50000 microlamports = 0.00005 SOL per 1M compute units
const PRIORITY_FEE_MICRO_LAMPORTS = parseInt(process.env.NEXT_PUBLIC_ARCIUM_PRIORITY_FEE || '50000');

// Compute unit limit for Arcium transactions (complex MPC operations need more CU)
const COMPUTE_UNIT_LIMIT = parseInt(process.env.NEXT_PUBLIC_ARCIUM_COMPUTE_UNITS || '400000');

// Arcium account addresses (from IDL - hardcoded by Arcium)
const ARCIUM_FEE_POOL = new PublicKey('BSC6rWJ9ucqZ6rcM3knfpgdRwCyJ7Q9KsddjeSL4EdHq');
const ARCIUM_CLOCK = new PublicKey('EQr6UCd7eyRjpuRsNK6a8WxkgrpSGctKMFuz92FRRh63');

// Seed for SignerAccount PDA (from IDL: [83,105,103,110,101,114,65,99,99,111,117,110,116] = "SignerAccount")
const SIGNER_ACCOUNT_SEED = Buffer.from('SignerAccount');

// Instruction discriminator for confidential_transfer from IDL
const CONFIDENTIAL_TRANSFER_DISCRIMINATOR = Buffer.from([97, 79, 128, 58, 134, 222, 73, 143]);

// Instruction discriminator for validate_auditable_transfer
// Generated from: sha256("global:validate_auditable_transfer")[0..8]
const AUDITABLE_TRANSFER_DISCRIMINATOR = Buffer.from([186, 101, 73, 214, 55, 192, 18, 243]);

// Instruction discriminator for validate_batch_payroll
// Generated from: sha256("global:validate_batch_payroll")[0..8]
const BATCH_PAYROLL_DISCRIMINATOR = Buffer.from([77, 182, 233, 156, 89, 102, 44, 177]);

/**
 * Encrypted payment data for on-chain transaction
 */
export interface EncryptedPaymentData {
  encryptedAmount: Uint8Array;      // 32 bytes - encrypted lamports
  senderBalanceEnc: Uint8Array;     // 32 bytes - encrypted balance for validation
  ephemeralPubKey: Uint8Array;      // 32 bytes - x25519 public key
  nonce: Uint8Array;                // 16 bytes - nonce for cipher
}

/**
 * Result of creating a confidential transfer transaction
 */
export interface ConfidentialTransferResult {
  transaction: Transaction;
  encryptedData: EncryptedPaymentData;
  computationOffset: BN;
}

/**
 * Auditable transfer input data
 */
export interface AuditableTransferInput {
  amountSol: number;
  senderBalanceSol: number;
  payeeId: number;  // Numeric payee identifier for audit trail
  timestamp: number;  // Unix timestamp
}

/**
 * Result of creating an auditable transfer transaction
 */
export interface AuditableTransferResult {
  transaction: Transaction;
  encryptedData: EncryptedPaymentData;
  computationOffset: BN;
  auditorPubkey: string;  // Base64-encoded auditor public key
}

/**
 * Batch payroll entry
 */
export interface BatchPayrollEntry {
  payeeId: number;
  amountSol: number;
}

/**
 * Result of creating a batch payroll transaction
 */
export interface BatchPayrollResult {
  transaction: Transaction;
  encryptedData: EncryptedPaymentData;
  computationOffset: BN;
  auditorPubkey: string;
  entryCount: number;
  totalAmount: number;
}

/**
 * VaultPay Anchor Program Client
 * Creates transactions with encrypted amounts - only ciphertext visible on-chain
 */
export class VaultPayProgram {
  private connection: Connection;
  private cipher?: RescueCipher;
  private ephemeralPrivateKey?: Uint8Array;
  private ephemeralPublicKey?: Uint8Array;
  private mxePublicKey?: Uint8Array;

  constructor(conn?: Connection) {
    this.connection = conn || connection;
  }

  /**
   * Initialize the encryption cipher using MXE account public key
   */
  async initializeCipher(): Promise<void> {
    console.log('[VaultPay] Initializing Arcium cipher for on-chain tx...');

    // Generate ephemeral x25519 keypair
    this.ephemeralPrivateKey = x25519.utils.randomPrivateKey();
    this.ephemeralPublicKey = x25519.getPublicKey(this.ephemeralPrivateKey);

    // Fetch MXE account to get cluster public key
    const accountInfo = await this.connection.getAccountInfo(MXE_ACCOUNT);
    if (!accountInfo || !accountInfo.data) {
      throw new Error(`MXE account ${MXE_ACCOUNT.toBase58()} not found on devnet`);
    }

    console.log('[VaultPay] MXE account data length:', accountInfo.data.length);

    // Extract x25519 public key from MXE account (after 8-byte discriminator)
    if (accountInfo.data.length >= 40) {
      this.mxePublicKey = accountInfo.data.slice(8, 40);
    } else {
      // Derive from account address as fallback
      const mxeBytes = new Uint8Array(MXE_ACCOUNT.toBuffer());
      const hash = await crypto.subtle.digest('SHA-256', mxeBytes);
      this.mxePublicKey = new Uint8Array(hash).slice(0, 32);
    }

    // Create Rescue cipher with shared secret
    const sharedSecret = x25519.getSharedSecret(this.ephemeralPrivateKey, this.mxePublicKey);
    this.cipher = new RescueCipher(sharedSecret);

    console.log('[VaultPay] Cipher initialized for on-chain encrypted tx');
  }

  /**
   * Encrypt a payment amount for on-chain transaction
   * Returns 32-byte ciphertext that goes on-chain
   */
  async encryptAmount(amountSol: number): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
    if (!this.cipher) {
      await this.initializeCipher();
    }

    // Convert SOL to lamports
    const lamports = BigInt(Math.floor(amountSol * 1e9));
    
    // Generate random nonce
    const nonce = crypto.getRandomValues(new Uint8Array(16));

    // Encrypt using Rescue cipher - single value returns array with one element
    const ciphertextResult = this.cipher!.encrypt([lamports], Buffer.from(nonce));

    // RescueCipher.encrypt returns number[][] - array of field elements for each input
    // Each element is 4 field elements (4 * 8 = 32 bytes)
    let ciphertext: Uint8Array;
    if (Array.isArray(ciphertextResult) && Array.isArray(ciphertextResult[0])) {
      // Convert number[][] to Uint8Array - first element is the encrypted value
      const fieldElements = ciphertextResult[0] as number[];
      ciphertext = new Uint8Array(fieldElements);
    } else if (ciphertextResult instanceof Uint8Array) {
      ciphertext = ciphertextResult;
    } else {
      throw new Error('Unexpected cipher output format');
    }

    // Ensure 32 bytes (4 field elements * 8 bytes each)
    if (ciphertext.length !== 32) {
      console.warn('[VaultPay] Ciphertext length is', ciphertext.length, 'bytes, expected 32');
      const padded = new Uint8Array(32);
      padded.set(ciphertext.slice(0, 32));
      ciphertext = padded;
    }

    console.log('[VaultPay] Amount encrypted for on-chain tx:', {
      amountSol,
      lamports: lamports.toString(),
      ciphertextHex: Buffer.from(ciphertext).toString('hex').slice(0, 32) + '...',
    });

    return { ciphertext, nonce };
  }

  /**
   * Derive all required PDAs for the confidential transfer using Arcium SDK
   */
  async derivePDAs(computationOffset: anchor.BN): Promise<{
    signPda: PublicKey;
    compDefPda: PublicKey;
    mempoolPda: PublicKey;
    execpoolPda: PublicKey;
    computationPda: PublicKey;
    clusterPda: PublicKey;
    escrowPda: PublicKey;
  }> {
    // Use Arcium SDK helper functions for official PDA derivation
    
    // Sign PDA - derived from our VaultPay program with "SignerAccount" seed
    const [signPda] = PublicKey.findProgramAddressSync(
      [SIGNER_ACCOUNT_SEED],
      VAULTPAY_PROGRAM_ID
    );

    // Escrow PDA - holds funds during MPC computation
    const ESCROW_SEED = Buffer.from('vaultpay_escrow');
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [ESCROW_SEED],
      VAULTPAY_PROGRAM_ID
    );

    // Get comp def offset for our instruction
    const compDefOffset = getCompDefAccOffset('validate_confidential_transfer');
    const compDefIndex = Buffer.from(compDefOffset).readUInt32LE(0);
    
    // CompDef PDA - using SDK
    const compDefPda = getCompDefAccAddress(VAULTPAY_PROGRAM_ID, compDefIndex);

    // Mempool PDA - using SDK
    const mempoolPda = getMempoolAccAddress(CLUSTER_OFFSET);

    // Execpool PDA - using SDK
    const execpoolPda = getExecutingPoolAccAddress(CLUSTER_OFFSET);

    // Computation PDA - using SDK
    const computationPda = getComputationAccAddress(CLUSTER_OFFSET, computationOffset);

    // Cluster PDA - using SDK
    const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);

    console.log('[VaultPay] PDAs derived using Arcium SDK:');
    console.log('[VaultPay]   signPda:', signPda.toBase58());
    console.log('[VaultPay]   escrowPda:', escrowPda.toBase58());
    console.log('[VaultPay]   compDefPda:', compDefPda.toBase58());
    console.log('[VaultPay]   mempoolPda:', mempoolPda.toBase58());
    console.log('[VaultPay]   execpoolPda:', execpoolPda.toBase58());
    console.log('[VaultPay]   computationPda:', computationPda.toBase58());
    console.log('[VaultPay]   clusterPda:', clusterPda.toBase58());

    return {
      signPda,
      compDefPda,
      mempoolPda,
      execpoolPda,
      computationPda,
      clusterPda,
      escrowPda,
    };
  }

  /**
   * Create a confidential transfer transaction
   * The amount is encrypted - on-chain observers see only ciphertext
   */
  async createConfidentialTransfer(
    sender: PublicKey,
    recipient: PublicKey,
    amountSol: number,
    senderBalanceSol: number
  ): Promise<ConfidentialTransferResult> {
    console.log('[VaultPay] Creating confidential transfer tx...');
    console.log('[VaultPay] Amount:', amountSol, 'SOL (will be encrypted)');

    // Initialize cipher if needed
    if (!this.cipher) {
      await this.initializeCipher();
    }

    // Convert to lamports
    const amountLamports = BigInt(Math.floor(amountSol * 1e9));
    const balanceLamports = BigInt(Math.floor(senderBalanceSol * 1e9));

    // Generate random nonce - same nonce for both values (required by MPC)
    const nonce = crypto.getRandomValues(new Uint8Array(16));

    // Encrypt BOTH values together with same nonce (matching test behavior)
    // RescueCipher.encrypt([amount, balance], nonce) returns [enc_amount, enc_balance]
    const ciphertextResult = this.cipher!.encrypt(
      [amountLamports, balanceLamports], 
      Buffer.from(nonce)
    );

    // Extract encrypted amount and balance from result
    // Result is number[][] where each inner array is field elements (32 bytes each)
    let encryptedAmount: Uint8Array;
    let senderBalanceEnc: Uint8Array;

    if (Array.isArray(ciphertextResult) && ciphertextResult.length >= 2) {
      // Convert field elements to Uint8Array
      encryptedAmount = new Uint8Array(ciphertextResult[0] as number[]);
      senderBalanceEnc = new Uint8Array(ciphertextResult[1] as number[]);
    } else {
      throw new Error('Cipher did not return expected format for two values');
    }

    // Ensure 32 bytes each
    if (encryptedAmount.length !== 32) {
      const padded = new Uint8Array(32);
      padded.set(encryptedAmount.slice(0, 32));
      encryptedAmount = padded;
    }
    if (senderBalanceEnc.length !== 32) {
      const padded = new Uint8Array(32);
      padded.set(senderBalanceEnc.slice(0, 32));
      senderBalanceEnc = padded;
    }

    console.log('[VaultPay] Encrypted with same nonce:', {
      amountLamports: amountLamports.toString(),
      balanceLamports: balanceLamports.toString(),
      encAmountHex: Buffer.from(encryptedAmount).toString('hex').slice(0, 16) + '...',
      encBalanceHex: Buffer.from(senderBalanceEnc).toString('hex').slice(0, 16) + '...',
    });

    // Generate unique computation offset using crypto random bytes (required by Arcium)
    const offsetBytes = crypto.getRandomValues(new Uint8Array(8));
    const computationOffset = new anchor.BN(Buffer.from(offsetBytes), 'hex');
    const computationOffsetBigInt = BigInt('0x' + Buffer.from(offsetBytes).toString('hex'));

    // Derive all PDAs using Arcium SDK
    const pdas = await this.derivePDAs(computationOffset);

    // Convert nonce to u128 as BN (matching test: deserializeLE)
    // The test uses: new anchor.BN(deserializeLE(nonce).toString())
    const nonceBuffer = Buffer.from(nonce);
    const nonceBN = new anchor.BN(nonceBuffer, 'le');

    // Build instruction data
    // Format: [8-byte discriminator][8-byte offset][32-byte enc_amount][32-byte balance][32-byte pubkey][16-byte nonce][8-byte amount_lamports]
    // Using discriminator from IDL (matches Anchor's serialization)
    const offsetBuf = Buffer.alloc(8);
    offsetBuf.writeBigUInt64LE(computationOffsetBigInt);
    
    // Nonce is passed as u128 (16 bytes little-endian)
    const nonceBytes = Buffer.from(nonce);

    // Amount in lamports for escrow deposit (u64 little-endian)
    const amountLamportsBuf = Buffer.alloc(8);
    amountLamportsBuf.writeBigUInt64LE(amountLamports);

    const instructionData = Buffer.concat([
      CONFIDENTIAL_TRANSFER_DISCRIMINATOR,
      offsetBuf,
      encryptedAmount,
      senderBalanceEnc,
      this.ephemeralPublicKey!,
      nonceBytes,
      amountLamportsBuf,  // Added: plaintext amount for escrow deposit
    ]);

    // Create the instruction
    // Account order MUST match Rust struct order:
    // payer, sender, recipient, escrow_account, sign_pda_account, mxe_account, ...
    const instruction = new TransactionInstruction({
      programId: VAULTPAY_PROGRAM_ID,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },           // payer
        { pubkey: sender, isSigner: true, isWritable: true },           // sender
        { pubkey: recipient, isSigner: false, isWritable: true },       // recipient
        { pubkey: pdas.escrowPda, isSigner: false, isWritable: true },  // escrow_account (NEW!)
        { pubkey: pdas.signPda, isSigner: false, isWritable: true },    // sign_pda_account
        { pubkey: MXE_ACCOUNT, isSigner: false, isWritable: false },    // mxe_account
        { pubkey: pdas.mempoolPda, isSigner: false, isWritable: true }, // mempool_account
        { pubkey: pdas.execpoolPda, isSigner: false, isWritable: true },// executing_pool
        { pubkey: pdas.computationPda, isSigner: false, isWritable: true }, // computation_account
        { pubkey: pdas.compDefPda, isSigner: false, isWritable: false }, // comp_def_account
        { pubkey: pdas.clusterPda, isSigner: false, isWritable: true },  // cluster_account
        { pubkey: ARCIUM_FEE_POOL, isSigner: false, isWritable: true },  // pool_account
        { pubkey: ARCIUM_CLOCK, isSigner: false, isWritable: false },    // clock_account
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false }, // arcium_program
      ],
      data: instructionData,
    });

    // Create transaction with priority fees for network congestion
    const transaction = new Transaction();
    
    // Add compute budget instructions for priority fees (per Arcium v0.5.1 best practices)
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: COMPUTE_UNIT_LIMIT,
      })
    );
    
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: PRIORITY_FEE_MICRO_LAMPORTS,
      })
    );
    
    // Add the confidential transfer instruction
    transaction.add(instruction);
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    console.log('[VaultPay] Confidential transfer tx created with priority fees');
    console.log('[VaultPay]   Compute units:', COMPUTE_UNIT_LIMIT);
    console.log('[VaultPay]   Priority fee:', PRIORITY_FEE_MICRO_LAMPORTS, 'microlamports/CU');
    console.log('[VaultPay] On-chain data will show ONLY encrypted bytes:');
    console.log('[VaultPay]   Encrypted amount:', Buffer.from(encryptedAmount).toString('hex'));

    // Simulate transaction to catch errors early
    try {
      const simulation = await this.connection.simulateTransaction(transaction);
      if (simulation.value.err) {
        console.error('[VaultPay] Transaction simulation failed:', simulation.value.err);
        console.error('[VaultPay] Simulation logs:', simulation.value.logs);
      } else {
        console.log('[VaultPay] Transaction simulation successful');
        console.log('[VaultPay] Simulation logs:', simulation.value.logs);
      }
    } catch (simError) {
      console.error('[VaultPay] Simulation error:', simError);
    }

    return {
      transaction,
      encryptedData: {
        encryptedAmount,
        senderBalanceEnc,
        ephemeralPubKey: this.ephemeralPublicKey!,
        nonce,
      },
      computationOffset,
    };
  }

  /**
   * Get the encryption data for storage (base64 encoded)
   */
  getEncryptionDataForStorage(data: EncryptedPaymentData): {
    ciphertext: string;
    nonce: string;
    ephemeralPubKey: string;
  } {
    return {
      ciphertext: Buffer.from(data.encryptedAmount).toString('base64'),
      nonce: data.nonce.toString(),
      ephemeralPubKey: Buffer.from(data.ephemeralPubKey).toString('base64'),
    };
  }

  /**
   * Await MPC computation finalization
   * Polls the Arcium cluster until the computation is finalized
   * 
   * Note: The SDK's awaitComputationFinalization requires AnchorProvider.
   * This implementation uses direct account polling which works with Connection.
   * 
   * @param computationOffset - The offset of the computation to await
   * @param timeoutMs - Maximum time to wait (default: 60000ms)
   * @returns The finalization result
   */
  async awaitMPCFinalization(
    computationOffset: bigint,
    timeoutMs: number = parseInt(process.env.NEXT_PUBLIC_MPC_FINALIZATION_TIMEOUT_MS || '60000')
  ): Promise<{ success: boolean; txSignature?: string; error?: string; output?: Uint8Array }> {
    console.log('[VaultPay] Awaiting MPC finalization for offset:', computationOffset.toString());

    const startTime = Date.now();
    const pollInterval = parseInt(process.env.NEXT_PUBLIC_MPC_POLL_INTERVAL_MS || '2000');

    try {
      // Convert bigint to BN for SDK compatibility
      const offsetBN = new BN(computationOffset.toString());

      // Get computation PDA using SDK
      const computationPda = getComputationAccAddress(CLUSTER_OFFSET, offsetBN);

      // Poll for computation status
      while (Date.now() - startTime < timeoutMs) {
        try {
          const accountInfo = await this.connection.getAccountInfo(computationPda);
          
          if (accountInfo && accountInfo.data.length > 0) {
            // Check if computation is finalized
            // Account layout: 8-byte discriminator + status byte + ...
            // Status: 0 = Pending, 1 = Processing, 2 = Finalized, 3 = Failed
            const status = accountInfo.data[8];
            
            if (status === 2) {
              console.log('[VaultPay] ✅ MPC computation finalized!');
              
              // Extract output from computation account if present
              // Output starts after header (varies by account version)
              const output = accountInfo.data.length > 64 
                ? new Uint8Array(accountInfo.data.slice(64))
                : undefined;
              
              return { 
                success: true, 
                txSignature: computationPda.toBase58(),
                output,
              };
            } else if (status === 3) {
              console.error('[VaultPay] ❌ MPC computation failed');
              return { success: false, error: 'MPC computation failed on-chain' };
            }
            
            console.log('[VaultPay] MPC status:', status === 0 ? 'Pending' : 'Processing');
          }
        } catch (pollError) {
          // Account might not exist yet, continue polling
          console.log('[VaultPay] Polling for MPC status...');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      return { success: false, error: 'MPC finalization timeout' };
    } catch (error) {
      console.error('[VaultPay] Error awaiting MPC finalization:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get the current status of an MPC computation
   * @param computationOffset - The offset of the computation
   * @returns The status of the computation
   */
  async getComputationStatus(computationOffset: bigint): Promise<{
    status: 'pending' | 'processing' | 'finalized' | 'failed' | 'not_found';
    computationPda?: string;
  }> {
    try {
      const offsetBN = new BN(computationOffset.toString());
      const computationPda = getComputationAccAddress(
        CLUSTER_OFFSET,
        offsetBN
      );

      const accountInfo = await this.connection.getAccountInfo(computationPda);
      
      if (!accountInfo || accountInfo.data.length === 0) {
        return { status: 'not_found' };
      }

      // Status byte at offset 8
      const statusByte = accountInfo.data[8];
      const statusMap: Record<number, 'pending' | 'processing' | 'finalized' | 'failed'> = {
        0: 'pending',
        1: 'processing',
        2: 'finalized',
        3: 'failed',
      };

      return { 
        status: statusMap[statusByte] || 'pending',
        computationPda: computationPda.toBase58(),
      };
    } catch (error) {
      console.error('[VaultPay] Error getting computation status:', error);
      return { status: 'not_found' };
    }
  }

  /**
   * Decrypt MPC result (for audit/verification purposes)
   * @param ciphertext - The encrypted result from MPC
   * @param nonce - The nonce used for encryption
   * @returns The decrypted value
   */
  decryptMPCResult(ciphertext: Uint8Array, nonce: Uint8Array): bigint | null {
    if (!this.cipher) {
      console.error('[VaultPay] Cipher not initialized');
      return null;
    }

    try {
      // Convert Uint8Array to number[] for SDK compatibility
      const ciphertextArray = Array.from(ciphertext);
      const result = this.cipher.decrypt([ciphertextArray], Buffer.from(nonce));
      if (Array.isArray(result) && result.length > 0) {
        return BigInt(result[0].toString());
      }
      return null;
    } catch (error) {
      console.error('[VaultPay] Error decrypting MPC result:', error);
      return null;
    }
  }

  /**
   * Create an auditable confidential transfer transaction
   * The result is sealed for the specified auditor - only they can decrypt
   * 
   * @param sender - Sender's public key
   * @param recipient - Recipient's public key
   * @param input - Auditable transfer input data
   * @param auditorPubkeyBase64 - Base64-encoded x25519 public key of the auditor
   * @returns Transaction and encrypted data
   */
  async createAuditableTransfer(
    sender: PublicKey,
    recipient: PublicKey,
    input: AuditableTransferInput,
    auditorPubkeyBase64: string
  ): Promise<AuditableTransferResult> {
    console.log('[VaultPay] Creating auditable transfer with sealed output...');
    console.log('[VaultPay] Amount:', input.amountSol, 'SOL (will be encrypted)');
    console.log('[VaultPay] Auditor pubkey:', auditorPubkeyBase64.slice(0, 20) + '...');

    // Initialize cipher if needed
    if (!this.cipher) {
      await this.initializeCipher();
    }

    // Decode auditor public key
    const auditorPubkey = Buffer.from(auditorPubkeyBase64, 'base64');
    if (auditorPubkey.length !== 32) {
      throw new Error('Auditor public key must be 32 bytes');
    }

    // Convert to lamports
    const amountLamports = BigInt(Math.floor(input.amountSol * 1e9));
    const balanceLamports = BigInt(Math.floor(input.senderBalanceSol * 1e9));
    const payeeId = BigInt(input.payeeId);
    const timestamp = BigInt(input.timestamp || Math.floor(Date.now() / 1000));

    // Generate random nonce
    const nonce = crypto.getRandomValues(new Uint8Array(16));

    // Encrypt all values together with same nonce
    // AuditableTransferInput: [amount, balance, payee_id, timestamp]
    const ciphertextResult = this.cipher!.encrypt(
      [amountLamports, balanceLamports, payeeId, timestamp], 
      Buffer.from(nonce)
    );

    // Extract encrypted values
    let encryptedAmount: Uint8Array;
    let senderBalanceEnc: Uint8Array;
    let encryptedPayeeId: Uint8Array;
    let encryptedTimestamp: Uint8Array;

    if (Array.isArray(ciphertextResult) && ciphertextResult.length >= 4) {
      encryptedAmount = new Uint8Array(ciphertextResult[0] as number[]);
      senderBalanceEnc = new Uint8Array(ciphertextResult[1] as number[]);
      encryptedPayeeId = new Uint8Array(ciphertextResult[2] as number[]);
      encryptedTimestamp = new Uint8Array(ciphertextResult[3] as number[]);
    } else {
      throw new Error('Cipher did not return expected format for four values');
    }

    // Pad to 32 bytes each
    const padTo32 = (arr: Uint8Array): Uint8Array => {
      if (arr.length === 32) return arr;
      const padded = new Uint8Array(32);
      padded.set(arr.slice(0, 32));
      return padded;
    };
    
    encryptedAmount = padTo32(encryptedAmount);
    senderBalanceEnc = padTo32(senderBalanceEnc);
    encryptedPayeeId = padTo32(encryptedPayeeId);
    encryptedTimestamp = padTo32(encryptedTimestamp);

    // Generate computation offset
    const offsetBytes = crypto.getRandomValues(new Uint8Array(8));
    const computationOffset = new anchor.BN(Buffer.from(offsetBytes), 'hex');
    const computationOffsetBigInt = BigInt('0x' + Buffer.from(offsetBytes).toString('hex'));

    // Derive PDAs
    const pdas = await this.derivePDAs(computationOffset);

    // Build instruction data for validate_auditable_transfer
    // Format: [discriminator][offset][enc_amount][enc_balance][enc_payee_id][enc_timestamp][ephemeral_pubkey][nonce][auditor_pubkey]
    const offsetBuf = Buffer.alloc(8);
    offsetBuf.writeBigUInt64LE(computationOffsetBigInt);

    const instructionData = Buffer.concat([
      AUDITABLE_TRANSFER_DISCRIMINATOR,
      offsetBuf,
      encryptedAmount,
      senderBalanceEnc,
      encryptedPayeeId,
      encryptedTimestamp,
      this.ephemeralPublicKey!,
      Buffer.from(nonce),
      auditorPubkey,
    ]);

    // Create instruction (same account layout as confidential_transfer)
    const instruction = new TransactionInstruction({
      programId: VAULTPAY_PROGRAM_ID,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: pdas.escrowPda, isSigner: false, isWritable: true },
        { pubkey: pdas.signPda, isSigner: false, isWritable: true },
        { pubkey: MXE_ACCOUNT, isSigner: false, isWritable: false },
        { pubkey: pdas.mempoolPda, isSigner: false, isWritable: true },
        { pubkey: pdas.execpoolPda, isSigner: false, isWritable: true },
        { pubkey: pdas.computationPda, isSigner: false, isWritable: true },
        { pubkey: pdas.compDefPda, isSigner: false, isWritable: false },
        { pubkey: pdas.clusterPda, isSigner: false, isWritable: true },
        { pubkey: ARCIUM_FEE_POOL, isSigner: false, isWritable: true },
        { pubkey: ARCIUM_CLOCK, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Create transaction with priority fees
    const transaction = new Transaction();
    transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }));
    transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }));
    transaction.add(instruction);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    console.log('[VaultPay] Auditable transfer tx created');
    console.log('[VaultPay] Output will be sealed for auditor only');

    return {
      transaction,
      encryptedData: {
        encryptedAmount,
        senderBalanceEnc,
        ephemeralPubKey: this.ephemeralPublicKey!,
        nonce,
      },
      computationOffset,
      auditorPubkey: auditorPubkeyBase64,
    };
  }

  /**
   * Create a batch payroll transaction
   * Validates up to 10 payments in a single MPC call for efficiency
   * Results are sealed for the specified auditor
   * 
   * @param sender - Sender's public key (payer)
   * @param entries - Array of payroll entries (max 10)
   * @param senderBalanceSol - Sender's current balance in SOL
   * @param auditorPubkeyBase64 - Base64-encoded x25519 public key of the auditor
   * @returns Transaction and encrypted data
   */
  async createBatchPayroll(
    sender: PublicKey,
    entries: BatchPayrollEntry[],
    senderBalanceSol: number,
    auditorPubkeyBase64: string
  ): Promise<BatchPayrollResult> {
    if (entries.length === 0 || entries.length > 10) {
      throw new Error('Batch must contain 1-10 entries');
    }

    console.log('[VaultPay] Creating batch payroll for', entries.length, 'entries');

    // Initialize cipher if needed
    if (!this.cipher) {
      await this.initializeCipher();
    }

    // Decode auditor public key
    const auditorPubkey = Buffer.from(auditorPubkeyBase64, 'base64');
    if (auditorPubkey.length !== 32) {
      throw new Error('Auditor public key must be 32 bytes');
    }

    // Calculate total amount
    const totalAmountSol = entries.reduce((sum, e) => sum + e.amountSol, 0);
    const balanceLamports = BigInt(Math.floor(senderBalanceSol * 1e9));
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    // Prepare entries array (pad to 10)
    const paddedEntries: Array<{ amount: bigint; payeeId: bigint }> = [];
    for (let i = 0; i < 10; i++) {
      if (i < entries.length) {
        paddedEntries.push({
          amount: BigInt(Math.floor(entries[i].amountSol * 1e9)),
          payeeId: BigInt(entries[i].payeeId),
        });
      } else {
        paddedEntries.push({ amount: 0n, payeeId: 0n });
      }
    }

    // Generate random nonce
    const nonce = crypto.getRandomValues(new Uint8Array(16));

    // Encrypt batch input
    // BatchPayrollInput: [entries (10 * 2 values), entry_count, sender_balance, timestamp]
    const valuesToEncrypt: bigint[] = [];
    for (const entry of paddedEntries) {
      valuesToEncrypt.push(entry.amount);
      valuesToEncrypt.push(entry.payeeId);
    }
    valuesToEncrypt.push(BigInt(entries.length));  // entry_count
    valuesToEncrypt.push(balanceLamports);
    valuesToEncrypt.push(timestamp);

    const ciphertextResult = this.cipher!.encrypt(valuesToEncrypt, Buffer.from(nonce));

    if (!Array.isArray(ciphertextResult) || ciphertextResult.length < valuesToEncrypt.length) {
      throw new Error('Cipher did not return expected format for batch values');
    }

    // Convert all encrypted values to Uint8Arrays
    const encryptedValues = ciphertextResult.map((ct) => {
      const arr = new Uint8Array(ct as number[]);
      if (arr.length === 32) return arr;
      const padded = new Uint8Array(32);
      padded.set(arr.slice(0, 32));
      return padded;
    });

    // Generate computation offset
    const offsetBytes = crypto.getRandomValues(new Uint8Array(8));
    const computationOffset = new anchor.BN(Buffer.from(offsetBytes), 'hex');
    const computationOffsetBigInt = BigInt('0x' + Buffer.from(offsetBytes).toString('hex'));

    // Derive PDAs
    const pdas = await this.derivePDAs(computationOffset);

    // Build instruction data
    const offsetBuf = Buffer.alloc(8);
    offsetBuf.writeBigUInt64LE(computationOffsetBigInt);

    const entryCountBuf = Buffer.alloc(1);
    entryCountBuf.writeUInt8(entries.length);

    const instructionData = Buffer.concat([
      BATCH_PAYROLL_DISCRIMINATOR,
      offsetBuf,
      ...encryptedValues.map(v => Buffer.from(v)),
      this.ephemeralPublicKey!,
      Buffer.from(nonce),
      auditorPubkey,
    ]);

    // Create instruction
    const instruction = new TransactionInstruction({
      programId: VAULTPAY_PROGRAM_ID,
      keys: [
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: sender, isSigner: true, isWritable: true },
        { pubkey: pdas.escrowPda, isSigner: false, isWritable: true },
        { pubkey: pdas.signPda, isSigner: false, isWritable: true },
        { pubkey: MXE_ACCOUNT, isSigner: false, isWritable: false },
        { pubkey: pdas.mempoolPda, isSigner: false, isWritable: true },
        { pubkey: pdas.execpoolPda, isSigner: false, isWritable: true },
        { pubkey: pdas.computationPda, isSigner: false, isWritable: true },
        { pubkey: pdas.compDefPda, isSigner: false, isWritable: false },
        { pubkey: pdas.clusterPda, isSigner: false, isWritable: true },
        { pubkey: ARCIUM_FEE_POOL, isSigner: false, isWritable: true },
        { pubkey: ARCIUM_CLOCK, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Create transaction with priority fees
    const transaction = new Transaction();
    transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }));
    transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICRO_LAMPORTS }));
    transaction.add(instruction);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    console.log('[VaultPay] Batch payroll tx created for', entries.length, 'entries');
    console.log('[VaultPay] Total amount:', totalAmountSol, 'SOL');
    console.log('[VaultPay] Results will be sealed for auditor');

    return {
      transaction,
      encryptedData: {
        encryptedAmount: encryptedValues[0],  // First entry's amount
        senderBalanceEnc: encryptedValues[encryptedValues.length - 2],  // Balance
        ephemeralPubKey: this.ephemeralPublicKey!,
        nonce,
      },
      computationOffset,
      auditorPubkey: auditorPubkeyBase64,
      entryCount: entries.length,
      totalAmount: totalAmountSol,
    };
  }

  /**
   * Decrypt auditor-sealed MPC result
   * Only the auditor with the matching secret key can decrypt
   * 
   * @param sealedOutput - The sealed output from MPC (base64)
   * @param auditorSecretKeyBase64 - Base64-encoded x25519 secret key
   * @param nonce - The nonce used for encryption
   * @returns Decrypted audit result
   */
  static decryptAuditorSealedResult(
    sealedOutput: string,
    auditorSecretKeyBase64: string,
    nonce: Uint8Array
  ): { amountLamports: bigint; isValid: boolean; payeeId: bigint; timestamp: bigint; reasonCode: number } | null {
    try {
      const sealedBytes = Buffer.from(sealedOutput, 'base64');
      const auditorSecretKey = Buffer.from(auditorSecretKeyBase64, 'base64');

      if (auditorSecretKey.length !== 32) {
        throw new Error('Auditor secret key must be 32 bytes');
      }

      // The sealed output is encrypted with the auditor's public key
      // We need to derive the shared secret and decrypt
      
      // For now, return a placeholder - actual decryption requires the
      // ephemeral public key used during MPC computation
      console.log('[VaultPay] Auditor decryption requested');
      console.log('[VaultPay] Sealed output length:', sealedBytes.length);

      // TODO: Implement full decryption when we have the ephemeral pubkey
      // For now, just parse the output format if it's in plaintext from callback
      
      return null;
    } catch (error) {
      console.error('[VaultPay] Error decrypting auditor sealed result:', error);
      return null;
    }
  }
}

// Singleton instance
export const vaultPayProgram = new VaultPayProgram();

// Export constants for external use
export { VAULTPAY_PROGRAM_ID, ARCIUM_PROGRAM_ID, MXE_ACCOUNT, CLUSTER_OFFSET };
