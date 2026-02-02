/**
 * Fix MXE Cluster Association
 * 
 * The MXE account is associated with a non-existent cluster.
 * This script calls setCluster to associate the MXE with cluster offset 123.
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, TransactionInstruction, Transaction } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants (updated after successful deployment)
const VAULTPAY_PROGRAM_ID = new PublicKey('ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ');
const MXE_ACCOUNT = new PublicKey('13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk');
const ARCIUM_PROGRAM_ID = new PublicKey('F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk');
const TARGET_CLUSTER_OFFSET = 123;
const RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VaultPay - Fix MXE Cluster Association                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');
  console.log('📡 Connected to:', RPC_URL);

  // Load wallet
  const walletPath = process.env.WALLET_PATH || `${os.homedir()}/.config/solana/id.json`;
  let wallet: Keypair;
  try {
    const walletFile = fs.readFileSync(walletPath);
    wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletFile.toString())));
    console.log('👛 Wallet:', wallet.publicKey.toBase58());
  } catch {
    // Try the svp id.json
    const altPath = path.join(__dirname, '../id.json');
    const walletFile = fs.readFileSync(altPath);
    wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletFile.toString())));
    console.log('👛 Wallet:', wallet.publicKey.toBase58());
  }
  console.log('');

  // Verify current MXE state
  console.log('🔍 Current MXE Account state:');
  const mxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
  if (!mxeInfo) {
    console.error('❌ MXE account not found!');
    process.exit(1);
  }

  // Read current cluster from MXE (offset 8, 32 bytes)
  const currentCluster = new PublicKey(mxeInfo.data.slice(8, 40));
  console.log('   Current cluster:', currentCluster.toBase58());
  
  // Check if current cluster exists
  const currentClusterInfo = await connection.getAccountInfo(currentCluster);
  console.log('   Cluster exists:', currentClusterInfo ? '✅' : '❌ NO!');
  console.log('');

  // Compute target cluster address
  const { getClusterAccAddress } = await import('@arcium-hq/client');
  const targetCluster = getClusterAccAddress(TARGET_CLUSTER_OFFSET);
  console.log('🎯 Target cluster (offset', TARGET_CLUSTER_OFFSET + '):');
  console.log('   Address:', targetCluster.toBase58());
  
  const targetClusterInfo = await connection.getAccountInfo(targetCluster);
  console.log('   Exists:', targetClusterInfo ? '✅' : '❌');
  console.log('');

  if (currentCluster.equals(targetCluster)) {
    console.log('✅ MXE already associated with correct cluster!');
    return;
  }

  if (!targetClusterInfo) {
    console.error('❌ Target cluster does not exist on-chain!');
    process.exit(1);
  }

  // Call setCluster instruction on Arcium program
  console.log('📤 Calling setCluster to associate MXE with cluster offset', TARGET_CLUSTER_OFFSET);
  console.log('');
  
  // setCluster instruction discriminator from SDK
  // discriminator: [140, 96, 38, 83, 225, 128, 25, 176] for "setCluster"
  const discriminator = Buffer.from([140, 96, 38, 83, 225, 128, 25, 176]);
  
  // Encode cluster offset as u32 LE
  const offsetBuf = Buffer.alloc(4);
  offsetBuf.writeUInt32LE(TARGET_CLUSTER_OFFSET, 0);
  
  const instructionData = Buffer.concat([discriminator, offsetBuf]);

  // Accounts for setCluster:
  // 1. mxe - MXE account PDA
  // 2. cluster - Cluster account PDA
  // 3. mxeProgram - The program that owns the MXE
  const instruction = new TransactionInstruction({
    programId: ARCIUM_PROGRAM_ID,
    keys: [
      { pubkey: MXE_ACCOUNT, isSigner: false, isWritable: true },
      { pubkey: targetCluster, isSigner: false, isWritable: false },
      { pubkey: VAULTPAY_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = wallet.publicKey;
  transaction.sign(wallet);

  try {
    // Simulate first
    console.log('🧪 Simulating transaction...');
    const simulation = await connection.simulateTransaction(transaction);
    if (simulation.value.err) {
      console.error('❌ Simulation failed:', simulation.value.err);
      console.error('   Logs:', simulation.value.logs);
      process.exit(1);
    }
    console.log('   Simulation passed!');
    console.log('');

    // Send transaction
    console.log('📤 Sending transaction...');
    const sig = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
    });
    console.log('   TX:', sig);

    // Confirm
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction({
      signature: sig,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      console.error('❌ Transaction failed:', confirmation.value.err);
      process.exit(1);
    }

    console.log('✅ Transaction confirmed!');
    console.log('');

    // Verify new state
    const newMxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
    if (newMxeInfo) {
      const newCluster = new PublicKey(newMxeInfo.data.slice(8, 40));
      console.log('🔍 New MXE cluster:', newCluster.toBase58());
      console.log('   Matches target:', newCluster.equals(targetCluster) ? '✅' : '❌');
    }
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    if (err.logs) {
      console.error('   Logs:', err.logs);
    }
    
    console.log('');
    console.log('💡 This might require re-deploying the MXE with:');
    console.log('   cd vaultpay_confidential');
    console.log('   arcium deploy --cluster-offset 123 --skip-deploy \\');
    console.log('     --keypair-path ~/.config/solana/id.json \\');
    console.log('     --rpc-url https://devnet.helius-rpc.com/?api-key=<your-key>');
  }
}

main().catch(console.error);
