/**
 * Read the MXE account to get the actual cluster configuration
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMempoolAccAddress, getExecutingPoolAccAddress, getClusterAccAddress } from '@arcium-hq/client';

const MXE_ACCOUNT = new PublicKey('13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk');
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Reading MXE account to find cluster configuration...');
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Read MXE account data
  const mxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
  if (!mxeInfo) {
    console.error('❌ MXE account not found!');
    return;
  }

  console.log('📦 MXE Account:', MXE_ACCOUNT.toBase58());
  console.log('   Data length:', mxeInfo.data.length, 'bytes');
  console.log('   Owner:', mxeInfo.owner.toBase58());
  console.log('');

  // Parse MXE account data
  // MXE account structure (after 8-byte discriminator):
  // - cluster: Pubkey (32 bytes) at offset 8
  // - x25519_pubkey: [u8; 32] at offset 40
  // - bump: u8 at offset 72
  // - etc.
  
  const data = mxeInfo.data;
  
  // Skip 8-byte discriminator, read cluster pubkey
  const clusterPubkey = new PublicKey(data.slice(8, 40));
  console.log('📍 Cluster from MXE:', clusterPubkey.toBase58());

  // Check if this cluster account exists
  const clusterInfo = await connection.getAccountInfo(clusterPubkey);
  if (!clusterInfo) {
    console.log('❌ Cluster account not found on-chain!');
    return;
  }

  console.log('   Cluster data length:', clusterInfo.data.length, 'bytes');
  console.log('');

  // The Cluster account structure (after 8-byte discriminator):
  // - num_nodes: u8
  // - threshold: u8
  // - mempool: Pubkey (32 bytes)
  // - executing_pool: Pubkey (32 bytes)
  // - etc.

  const clusterData = clusterInfo.data;
  
  // Parse cluster account - structure may vary, let's dump the first 100 bytes
  console.log('📦 Cluster Account Data (hex):');
  for (let i = 0; i < Math.min(120, clusterData.length); i += 32) {
    const slice = clusterData.slice(i, Math.min(i + 32, clusterData.length));
    const hex = Buffer.from(slice).toString('hex');
    // Try to parse as pubkey
    try {
      if (slice.length === 32) {
        const pk = new PublicKey(slice);
        console.log(`  [${i.toString().padStart(3)}]: ${hex} -> ${pk.toBase58()}`);
      } else {
        console.log(`  [${i.toString().padStart(3)}]: ${hex}`);
      }
    } catch {
      console.log(`  [${i.toString().padStart(3)}]: ${hex}`);
    }
  }

  console.log('');
  
  // Let's try to find mempool in the cluster data
  // Common offsets after discriminator (8 bytes):
  // - At offset 8: might be num_nodes, threshold, etc.
  // - At offset 10 or 16: mempool pubkey
  
  // Try different offsets for mempool
  const possibleOffsets = [8, 10, 16, 40, 48, 64, 72, 80, 88];
  console.log('🔍 Searching for mempool pubkey in cluster data...');
  
  for (const offset of possibleOffsets) {
    if (offset + 32 <= clusterData.length) {
      try {
        const pk = new PublicKey(clusterData.slice(offset, offset + 32));
        const accountInfo = await connection.getAccountInfo(pk);
        console.log(`  Offset ${offset.toString().padStart(2)}: ${pk.toBase58()} ${accountInfo ? '✅ exists' : ''}`);
      } catch {
        // Not a valid pubkey
      }
    }
  }
}

main().catch(console.error);
