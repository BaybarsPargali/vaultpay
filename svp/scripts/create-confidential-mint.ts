#!/usr/bin/env npx ts-node
/**
 * VaultPay - Create Confidential Token Mint
 * 
 * This script creates a Token-2022 mint with the Confidential Transfer extension.
 * This enables TRUE private transfers where amounts are encrypted on-chain.
 * 
 * Usage:
 *   npx ts-node scripts/create-confidential-mint.ts
 * 
 * Requirements:
 *   - Solana CLI installed
 *   - Keypair at ~/.config/solana/id.json or ./id.json
 *   - SOL on devnet for transaction fees
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  createInitializeMintInstruction,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Devnet RPC with Helius
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';
const RPC_URL = HELIUS_API_KEY 
  ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.devnet.solana.com';

/**
 * Load keypair from file
 */
function loadKeypair(): Keypair {
  // Try local id.json first
  const localPath = path.join(process.cwd(), 'id.json');
  if (fs.existsSync(localPath)) {
    const data = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(data));
  }
  
  // Try ~/.config/solana/id.json
  const homePath = process.env.HOME || process.env.USERPROFILE || '';
  const solanaPath = path.join(homePath, '.config', 'solana', 'id.json');
  if (fs.existsSync(solanaPath)) {
    const data = JSON.parse(fs.readFileSync(solanaPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(data));
  }
  
  throw new Error('No keypair found. Please create one with: solana-keygen new');
}

/**
 * Create instruction to initialize confidential transfer mint extension
 * 
 * Based on the Token-2022 ConfidentialTransferInstruction::InitializeMint
 * Reference: https://docs.rs/spl-token-2022/latest/spl_token_2022/extension/confidential_transfer/instruction/struct.InitializeMintData.html
 * 
 * Data structure (InitializeMintData):
 *   - authority: OptionalNonZeroPubkey (32 bytes, zeros = None)
 *   - auto_approve_new_accounts: PodBool (1 byte)
 *   - auditor_elgamal_pubkey: OptionalNonZeroElGamalPubkey (32 bytes, zeros = None)
 */
function buildInitializeConfidentialTransferMintInstruction(
  mint: PublicKey,
  authority: PublicKey | null,
  autoApproveNewAccounts: boolean,
  auditorElGamalPubkey: Uint8Array | null = null,
): TransactionInstruction {
  // Total data size:
  // 1 byte: TokenInstruction::ConfidentialTransferExtension (27)
  // 1 byte: ConfidentialTransferInstruction::InitializeMint (0)
  // 32 bytes: authority (zeros = None)
  // 1 byte: auto_approve_new_accounts
  // 32 bytes: auditor_elgamal_pubkey (zeros = None)
  // Total: 67 bytes
  
  const data = Buffer.alloc(67);
  let offset = 0;
  
  // TokenInstruction::ConfidentialTransferExtension = 27
  data.writeUInt8(27, offset);
  offset += 1;
  
  // ConfidentialTransferInstruction::InitializeMint = 0
  data.writeUInt8(0, offset);
  offset += 1;
  
  // authority (OptionalNonZeroPubkey - 32 bytes, zeros = None)
  if (authority) {
    authority.toBuffer().copy(data, offset);
  }
  // If null, leave as zeros (already zeroed by Buffer.alloc)
  offset += 32;
  
  // auto_approve_new_accounts (PodBool - 1 byte)
  data.writeUInt8(autoApproveNewAccounts ? 1 : 0, offset);
  offset += 1;
  
  // auditor_elgamal_pubkey (OptionalNonZeroElGamalPubkey - 32 bytes, zeros = None)
  if (auditorElGamalPubkey && auditorElGamalPubkey.length === 32) {
    Buffer.from(auditorElGamalPubkey).copy(data, offset);
  }
  // If null, leave as zeros (already zeroed by Buffer.alloc)
  offset += 32;

  return new TransactionInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
    ],
    data,
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('VaultPay - Confidential Token Mint Creator');
  console.log('='.repeat(60));
  console.log();
  
  // Connect to devnet
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log(`📡 Connected to: ${RPC_URL.includes('helius') ? 'Helius Devnet' : 'Solana Devnet'}`);
  
  // Load payer keypair
  const payer = loadKeypair();
  console.log(`👛 Payer: ${payer.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log();
    console.log('⚠️  Low balance! Requesting airdrop...');
    const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('✅ Airdrop received!');
  }
  
  console.log();
  console.log('🔧 Creating Confidential Token Mint...');
  console.log();
  
  // Generate mint keypair
  const mintKeypair = Keypair.generate();
  console.log(`🔑 Mint Address: ${mintKeypair.publicKey.toBase58()}`);
  
  // Calculate mint account size with ConfidentialTransferMint extension
  const mintLen = getMintLen([ExtensionType.ConfidentialTransferMint]);
  console.log(`📐 Mint account size: ${mintLen} bytes`);
  
  // Get minimum rent
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  console.log(`💸 Rent-exempt minimum: ${lamports / LAMPORTS_PER_SOL} SOL`);
  
  // Build transaction
  const transaction = new Transaction();
  
  // 1. Create account for mint
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );
  
  // 2. Initialize confidential transfer extension
  // This MUST be done before initializing the mint itself
  // Use our custom instruction builder since it's not exported from spl-token
  transaction.add(
    buildInitializeConfidentialTransferMintInstruction(
      mintKeypair.publicKey,       // mint
      payer.publicKey,             // authority for approving accounts
      true,                        // autoApproveNewAccounts
      null,                        // auditorElGamalPubkey (optional)
    )
  );
  
  // 3. Initialize the mint (standard Token-2022 instruction)
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      9,                   // 9 decimals (same as SOL)
      payer.publicKey,     // Mint authority
      null,                // No freeze authority
      TOKEN_2022_PROGRAM_ID,
    )
  );
  
  console.log();
  console.log('📤 Sending transaction...');
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log();
    console.log('✅ SUCCESS! Confidential Token Mint Created!');
    console.log('='.repeat(60));
    console.log();
    console.log(`🔐 Confidential Mint Address:`);
    console.log(`   ${mintKeypair.publicKey.toBase58()}`);
    console.log();
    console.log(`📝 Transaction Signature:`);
    console.log(`   ${signature}`);
    console.log();
    console.log(`🔗 Solscan:`);
    console.log(`   https://solscan.io/token/${mintKeypair.publicKey.toBase58()}?cluster=devnet`);
    console.log();
    console.log('='.repeat(60));
    console.log();
    console.log('📋 Add to your .env file:');
    console.log();
    console.log(`NEXT_PUBLIC_CONFIDENTIAL_MINT=${mintKeypair.publicKey.toBase58()}`);
    console.log();
    
    // Save mint address to file
    const envPath = path.join(process.cwd(), '.env.confidential-mint');
    fs.writeFileSync(envPath, `NEXT_PUBLIC_CONFIDENTIAL_MINT=${mintKeypair.publicKey.toBase58()}\n`);
    console.log(`💾 Saved to ${envPath}`);
    
    // Save mint keypair (for minting authority)
    const keypairPath = path.join(process.cwd(), 'confidential-mint-keypair.json');
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
    console.log(`💾 Mint keypair saved to ${keypairPath}`);
    console.log();
    
    return mintKeypair.publicKey;
    
  } catch (error) {
    console.error();
    console.error('❌ Transaction failed:', error);
    
    if (error instanceof Error && error.message.includes('logs')) {
      console.error();
      console.error('Transaction logs:', (error as any).logs);
    }
    
    throw error;
  }
}

main().catch(console.error);
