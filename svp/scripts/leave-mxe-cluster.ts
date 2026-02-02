/**
 * Leave MXE Cluster Script
 * 
 * This script calls the Arcium program's leaveMxe instruction to
 * detach the MXE from its current (invalid) cluster.
 * 
 * After this, we can call setCluster to set the correct cluster.
 * 
 * Run from WSL: npx ts-node scripts/leave-mxe-cluster.ts
 */

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Program IDs
const ARCIUM_PROGRAM_ID = new PublicKey('F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk');
const VAULTPAY_PROGRAM_ID = new PublicKey('ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ');

// Current (invalid) cluster offset from MXE
const CURRENT_CLUSTER_OFFSET = 53456743;

// leaveMxe discriminator from Arcium IDL
const LEAVE_MXE_DISCRIMINATOR = Buffer.from([225, 222, 68, 9, 96, 160, 126, 211]);

// PDA seeds
const MXE_ACCOUNT_SEED = Buffer.from('MXEAccount');
const CLUSTER_SEED = Buffer.from('Cluster');

async function main() {
  console.log('========================================');
  console.log('VaultPay MXE Leave Cluster');
  console.log('========================================\n');

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(os.homedir(), '.config', 'solana', 'id.json');
  console.log(`Loading wallet from: ${walletPath}`);
  
  if (!fs.existsSync(walletPath)) {
    console.error(`❌ Wallet not found at ${walletPath}`);
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log(`✅ Wallet loaded: ${wallet.publicKey.toBase58()}\n`);

  // Connect to devnet
  const rpcUrl = process.env.RPC_URL || 'https://devnet.helius-rpc.com/?api-key=5e9a1131-b481-4262-a28a-16de5ac9c72e';
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`Connected to: ${rpcUrl.split('?')[0]}...\n`);

  // Derive MXE PDA
  const [mxePda] = PublicKey.findProgramAddressSync(
    [MXE_ACCOUNT_SEED, VAULTPAY_PROGRAM_ID.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  console.log(`MXE Account PDA: ${mxePda.toBase58()}`);

  // Derive current (invalid) cluster PDA
  const clusterOffsetBytes = Buffer.alloc(4);
  clusterOffsetBytes.writeUInt32LE(CURRENT_CLUSTER_OFFSET);
  const [currentClusterPda] = PublicKey.findProgramAddressSync(
    [CLUSTER_SEED, clusterOffsetBytes],
    ARCIUM_PROGRAM_ID
  );
  console.log(`Current Cluster PDA (offset ${CURRENT_CLUSTER_OFFSET}): ${currentClusterPda.toBase58()}`);

  // Verify accounts
  console.log('\n🔍 Verifying accounts...');
  
  const mxeInfo = await connection.getAccountInfo(mxePda);
  if (!mxeInfo) {
    console.error('❌ MXE account does not exist!');
    process.exit(1);
  }
  console.log(`✅ MXE account exists (${mxeInfo.data.length} bytes)`);

  const clusterInfo = await connection.getAccountInfo(currentClusterPda);
  if (!clusterInfo) {
    console.log(`⚠️  Current cluster (offset ${CURRENT_CLUSTER_OFFSET}) does NOT exist on-chain!`);
    console.log('   This is the problem - the MXE points to a non-existent cluster.');
    console.log('   leaveMxe may fail because the cluster account is required.\n');
  } else {
    console.log(`✅ Current cluster exists (${clusterInfo.data.length} bytes)`);
  }

  // Build leaveMxe instruction
  console.log('\n📝 Building leaveMxe transaction...');

  // Instruction data: [8-byte discriminator][4-byte cluster_offset LE][32-byte mxeProgram pubkey]
  const instructionData = Buffer.concat([
    LEAVE_MXE_DISCRIMINATOR,
    clusterOffsetBytes,
    VAULTPAY_PROGRAM_ID.toBuffer(),
  ]);

  const instruction = new TransactionInstruction({
    programId: ARCIUM_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },  // authority
      { pubkey: currentClusterPda, isSigner: false, isWritable: true }, // clusterAcc
      { pubkey: mxePda, isSigner: false, isWritable: true },           // mxe
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;

  // Simulate first
  console.log('\n🔄 Simulating transaction...');
  try {
    const simulation = await connection.simulateTransaction(transaction, [wallet]);
    
    if (simulation.value.err) {
      console.error('❌ Simulation failed:', JSON.stringify(simulation.value.err, null, 2));
      console.error('\nLogs:');
      simulation.value.logs?.forEach(log => console.error('  ', log));
      
      // The cluster doesn't exist, so this will likely fail
      if (simulation.value.logs?.some(log => log.includes('AccountNotInitialized') || log.includes('ConstraintSeeds'))) {
        console.log('\n⚠️  The cluster account does not exist on-chain.');
        console.log('   Since the MXE references a non-existent cluster, standard recovery is blocked.');
        console.log('\n   Options:');
        console.log('   1. Deploy a new program with a fresh program ID');
        console.log('   2. Contact Arcium team for manual intervention');
      }
      process.exit(1);
    }
    
    console.log('✅ Simulation successful!');
    simulation.value.logs?.forEach(log => console.log('  ', log));
  } catch (error) {
    console.error('❌ Simulation error:', error);
    process.exit(1);
  }

  // Send transaction
  console.log('\n📤 Sending transaction...');
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ SUCCESS! MXE detached from cluster');
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log('\n   Now run: npx ts-node scripts/set-mxe-cluster.ts');

  } catch (error: any) {
    console.error('❌ Transaction failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
