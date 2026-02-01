/**
 * VaultPay - Arcium MPC Initialization Script
 * 
 * This script initializes the computation definition for confidential transfers.
 * Run this ONCE after deploying the VaultPay program to devnet.
 * 
 * Usage:
 *   npx ts-node scripts/init-arcium.ts
 * 
 * Prerequisites:
 *   - VaultPay program deployed to devnet
 *   - Solana CLI configured with devnet and funded wallet
 *   - Arcium devnet cluster available
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getCompDefAccOffset,
  getCompDefAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getClusterAccAddress,
  buildFinalizeCompDefTx,
  getMXEPublicKey,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VAULTPAY_PROGRAM_ID = new PublicKey('ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ');
const CLUSTER_OFFSET = 123; // Arcium devnet cluster offset
const RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

// Load IDL
const IDL_PATH = path.join(__dirname, '../vaultpay_confidential/target/idl/vaultpay_confidential.json');

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VaultPay - Arcium MPC Initialization                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Connect to devnet
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log('📡 Connected to:', RPC_URL);
  console.log('');

  // Load wallet
  const walletPath = process.env.WALLET_PATH || `${os.homedir()}/.config/solana/id.json`;
  let wallet: Keypair;
  try {
    const walletFile = fs.readFileSync(walletPath);
    wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletFile.toString())));
    console.log('👛 Wallet:', wallet.publicKey.toBase58());
  } catch (err) {
    console.error('❌ Failed to load wallet from:', walletPath);
    console.error('   Make sure you have a Solana keypair at ~/.config/solana/id.json');
    console.error('   Or set WALLET_PATH environment variable');
    process.exit(1);
  }

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL for initialization.');
    console.error('   Run: solana airdrop 2 --url devnet');
    process.exit(1);
  }
  console.log('');

  // Check program deployment
  console.log('🔍 Checking VaultPay program...');
  const programInfo = await connection.getAccountInfo(VAULTPAY_PROGRAM_ID);
  if (!programInfo) {
    console.error('❌ VaultPay program not found at:', VAULTPAY_PROGRAM_ID.toBase58());
    console.error('   Deploy the program first: cd vaultpay_confidential && anchor deploy');
    process.exit(1);
  }
  if (!programInfo.executable) {
    console.error('❌ VaultPay program account is not executable');
    process.exit(1);
  }
  console.log('✅ VaultPay program deployed');
  console.log('');

  // Get account addresses
  console.log('📍 Account Addresses:');
  const compDefOffset = getCompDefAccOffset('validate_confidential_transfer');
  const compDefIndex = Buffer.from(compDefOffset).readUInt32LE(0);
  
  const baseSeedCompDefAcc = getArciumAccountBaseSeed('ComputationDefinitionAccount');
  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, VAULTPAY_PROGRAM_ID.toBuffer(), compDefOffset],
    getArciumProgramId(),
  )[0];

  const mxeAccount = getMXEAccAddress(VAULTPAY_PROGRAM_ID);
  const mempoolAccount = getMempoolAccAddress(CLUSTER_OFFSET);
  const execpoolAccount = getExecutingPoolAccAddress(CLUSTER_OFFSET);
  const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);

  console.log('   CompDef PDA:', compDefPDA.toBase58());
  console.log('   MXE Account:', mxeAccount.toBase58());
  console.log('   Mempool:', mempoolAccount.toBase58());
  console.log('   ExecPool:', execpoolAccount.toBase58());
  console.log('   Cluster:', clusterAccount.toBase58());
  console.log('');

  // Check account status
  console.log('🔍 Checking account status...');
  
  const compDefInfo = await connection.getAccountInfo(compDefPDA);
  const mxeInfo = await connection.getAccountInfo(mxeAccount);
  const clusterInfo = await connection.getAccountInfo(clusterAccount);

  console.log('   CompDef:', compDefInfo ? `✅ Initialized (${compDefInfo.data.length} bytes)` : '❌ Not initialized');
  console.log('   MXE:', mxeInfo ? `✅ Exists (${mxeInfo.data.length} bytes)` : '❌ Not found');
  console.log('   Cluster:', clusterInfo ? `✅ Exists (${clusterInfo.data.length} bytes)` : '❌ Not found');
  console.log('');

  // Check if MXE exists (required for initialization)
  if (!mxeInfo) {
    console.error('❌ MXE account not found. This is created by Arcium when the program is registered.');
    console.error('   The Arcium cluster may need to be initialized for your program.');
    console.error('');
    console.error('   To register your program with Arcium devnet:');
    console.error('   1. Ensure your program is deployed');
    console.error('   2. Contact Arcium team or use their registration process');
    console.error('   3. Or run local testing with: arcium localnet');
    process.exit(1);
  }

  // Initialize CompDef if needed
  if (!compDefInfo) {
    console.log('🚀 Initializing computation definition...');
    
    // Load IDL
    let idl: anchor.Idl;
    try {
      idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));
    } catch (err) {
      console.error('❌ Failed to load IDL from:', IDL_PATH);
      console.error('   Build the program first: cd vaultpay_confidential && anchor build');
      process.exit(1);
    }

    // Create provider and program
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(wallet),
      { commitment: 'confirmed' }
    );
    anchor.setProvider(provider);
    const program = new anchor.Program(idl as anchor.Idl, provider);

    try {
      // Initialize the computation definition
      console.log('   Sending init_validate_transfer_comp_def transaction...');
      const initSig = await program.methods
        .initValidateTransferCompDef()
        .accounts({
          compDefAccount: compDefPDA,
          payer: wallet.publicKey,
          mxeAccount: mxeAccount,
        })
        .signers([wallet])
        .rpc({ commitment: 'confirmed' });
      
      console.log('   ✅ Init TX:', initSig);

      // Finalize the computation definition
      console.log('   Finalizing computation definition...');
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        compDefIndex,
        VAULTPAY_PROGRAM_ID,
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      finalizeTx.sign(wallet);
      
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log('   ✅ Finalize TX:', finalizeSig);

      console.log('');
      console.log('🎉 Computation definition initialized successfully!');
    } catch (err) {
      console.error('❌ Failed to initialize computation definition:', err);
      process.exit(1);
    }
  } else {
    console.log('✅ Computation definition already initialized!');
  }

  // Verify MXE public key is accessible
  console.log('');
  console.log('🔐 Verifying encryption setup...');
  try {
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(wallet),
      { commitment: 'confirmed' }
    );
    
    const mxePubKey = await getMXEPublicKey(provider, VAULTPAY_PROGRAM_ID);
    if (mxePubKey) {
      console.log('   ✅ MXE public key available for encryption');
      console.log('   MXE x25519 pubkey:', Buffer.from(mxePubKey).toString('hex').slice(0, 32) + '...');
    } else {
      console.log('   ⚠️  MXE public key not available yet');
      console.log('   The Arcium cluster may still be initializing');
    }
  } catch (err) {
    console.log('   ⚠️  Could not fetch MXE public key:', err);
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 Summary:');
  console.log('   Program ID:', VAULTPAY_PROGRAM_ID.toBase58());
  console.log('   CompDef PDA:', compDefPDA.toBase58());
  console.log('   Cluster Offset:', CLUSTER_OFFSET);
  console.log('');
  console.log('🔧 Update your .env file with:');
  console.log(`   NEXT_PUBLIC_COMPDEF_VALIDATE_TRANSFER=${compDefPDA.toBase58()}`);
  console.log('');
}

main().catch(console.error);
