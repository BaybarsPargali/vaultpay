/**
 * Set MXE Cluster Script
 * 
 * This script calls the Arcium program's setCluster instruction to
 * associate an existing MXE with a valid cluster (offset 123).
 * 
 * Run from WSL: npx ts-node scripts/set-mxe-cluster.ts
 */

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Program IDs
const ARCIUM_PROGRAM_ID = new PublicKey('F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk');
const VAULTPAY_PROGRAM_ID = new PublicKey('ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ');

// Target cluster offset
const TARGET_CLUSTER_OFFSET = 123;

// setCluster discriminator from Arcium IDL
const SET_CLUSTER_DISCRIMINATOR = Buffer.from([140, 96, 38, 83, 225, 128, 25, 176]);

// PDA seeds
const MXE_ACCOUNT_SEED = Buffer.from('MXEAccount');
const CLUSTER_SEED = Buffer.from('Cluster');

async function main() {
  console.log('========================================');
  console.log('VaultPay MXE Cluster Fix (setCluster)');
  console.log('========================================\n');

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(os.homedir(), '.config', 'solana', 'id.json');
  console.log(`Loading wallet from: ${walletPath}`);
  
  if (!fs.existsSync(walletPath)) {
    console.error(`❌ Wallet not found at ${walletPath}`);
    console.log('   Set WALLET_PATH environment variable or ensure ~/.config/solana/id.json exists');
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

  // Derive target cluster PDA (offset 123)
  const clusterOffsetBytes = Buffer.alloc(4);
  clusterOffsetBytes.writeUInt32LE(TARGET_CLUSTER_OFFSET);
  const [clusterPda] = PublicKey.findProgramAddressSync(
    [CLUSTER_SEED, clusterOffsetBytes],
    ARCIUM_PROGRAM_ID
  );
  console.log(`Target Cluster PDA (offset ${TARGET_CLUSTER_OFFSET}): ${clusterPda.toBase58()}`);

  // Verify accounts exist
  console.log('\n🔍 Verifying accounts...');
  
  const mxeInfo = await connection.getAccountInfo(mxePda);
  if (!mxeInfo) {
    console.error('❌ MXE account does not exist!');
    process.exit(1);
  }
  console.log(`✅ MXE account exists (${mxeInfo.data.length} bytes)`);

  // Parse MXE account to check authority
  // Structure after 8-byte discriminator:
  // - cluster: Option<u32> (5 bytes if Some, 1 if None)
  // - keygenOffset: u64 (8 bytes)
  // - keyRecoveryInitOffset: u64 (8 bytes)  
  // - mxeProgramId: Pubkey (32 bytes)
  // - authority: Option<Pubkey> (33 bytes if Some, 1 if None)
  
  let offset = 8; // Skip discriminator
  
  // Read cluster Option<u32>
  const clusterTag = mxeInfo.data[offset];
  offset += 1;
  let currentClusterOffset: number | null = null;
  if (clusterTag === 1) {
    currentClusterOffset = mxeInfo.data.readUInt32LE(offset);
    offset += 4;
  }
  console.log(`   Current cluster offset: ${currentClusterOffset !== null ? currentClusterOffset : 'None'}`);

  // Skip keygenOffset (u64)
  offset += 8;
  // Skip keyRecoveryInitOffset (u64)
  offset += 8;
  // Skip mxeProgramId (32 bytes)
  offset += 32;

  // Read authority Option<Pubkey>
  const authorityTag = mxeInfo.data[offset];
  offset += 1;
  let authority: PublicKey | null = null;
  if (authorityTag === 1) {
    authority = new PublicKey(mxeInfo.data.slice(offset, offset + 32));
  }
  console.log(`   MXE authority: ${authority ? authority.toBase58() : 'None (anyone can modify)'}`);

  // Check if our wallet is the authority
  if (authority && !authority.equals(wallet.publicKey)) {
    console.error(`\n❌ Your wallet is NOT the MXE authority!`);
    console.error(`   Your wallet: ${wallet.publicKey.toBase58()}`);
    console.error(`   MXE authority: ${authority.toBase58()}`);
    console.error(`\n   You need to use the authority wallet to call setCluster.`);
    process.exit(1);
  }

  const clusterInfo = await connection.getAccountInfo(clusterPda);
  if (!clusterInfo) {
    console.error(`❌ Target cluster (offset ${TARGET_CLUSTER_OFFSET}) does not exist!`);
    process.exit(1);
  }
  console.log(`✅ Target cluster exists (${clusterInfo.data.length} bytes)`);

  // Build setCluster instruction
  console.log('\n📝 Building setCluster transaction...');

  // Instruction data: [8-byte discriminator][4-byte cluster_offset LE]
  const instructionData = Buffer.concat([
    SET_CLUSTER_DISCRIMINATOR,
    clusterOffsetBytes,
  ]);

  const instruction = new TransactionInstruction({
    programId: ARCIUM_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },  // signer
      { pubkey: mxePda, isSigner: false, isWritable: true },           // mxe (writable to update cluster)
      { pubkey: clusterPda, isSigner: false, isWritable: false },      // cluster
      { pubkey: VAULTPAY_PROGRAM_ID, isSigner: false, isWritable: false }, // mxeProgram
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
      
      // Check for specific errors
      if (simulation.value.logs?.some(log => log.includes('ClusterAlreadySet'))) {
        console.log('\n⚠️  The MXE already has a cluster set. It may need leaveMxe first.');
      }
      process.exit(1);
    }
    
    console.log('✅ Simulation successful!');
    console.log('   Logs:');
    simulation.value.logs?.forEach(log => console.log('    ', log));
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

    console.log('\n✅ SUCCESS! MXE cluster updated to offset 123');
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
    
    // Verify the change
    console.log('\n🔍 Verifying change...');
    const updatedMxe = await connection.getAccountInfo(mxePda);
    if (updatedMxe) {
      const newClusterTag = updatedMxe.data[8];
      if (newClusterTag === 1) {
        const newOffset = updatedMxe.data.readUInt32LE(9);
        console.log(`   New cluster offset: ${newOffset}`);
        if (newOffset === TARGET_CLUSTER_OFFSET) {
          console.log('   ✅ Cluster successfully updated to 123!');
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Transaction failed:', error.message);
    if (error.logs) {
      console.error('   Logs:');
      error.logs.forEach((log: string) => console.error('    ', log));
    }
    process.exit(1);
  }
}

main().catch(console.error);
