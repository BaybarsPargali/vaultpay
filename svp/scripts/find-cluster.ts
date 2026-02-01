/**
 * Find the correct Arcium cluster offset for devnet
 */

import { getMempoolAccAddress, getExecutingPoolAccAddress, getClusterAccAddress } from '@arcium-hq/client';
import { Connection, PublicKey } from '@solana/web3.js';

const TARGET_MEMPOOL = 'DNDMoeo2ZyCwaGZeF1P7N7kN2HW17zLiURgvaLWUovjs';
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Searching for correct Arcium cluster offset...');
  console.log('Target mempool:', TARGET_MEMPOOL);
  console.log('');

  // Try a range of offsets
  for (let offset = 0; offset <= 500; offset++) {
    const mempool = getMempoolAccAddress(offset);
    if (mempool.toBase58() === TARGET_MEMPOOL) {
      console.log('✅ FOUND IT!');
      console.log('');
      console.log('Cluster Offset:', offset);
      console.log('Mempool:', mempool.toBase58());
      console.log('ExecPool:', getExecutingPoolAccAddress(offset).toBase58());
      console.log('Cluster:', getClusterAccAddress(offset).toBase58());
      console.log('');
      console.log('🔧 Update your .env with:');
      console.log(`NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET="${offset}"`);
      
      // Also verify these accounts exist on-chain
      const connection = new Connection(RPC_URL, 'confirmed');
      const clusterInfo = await connection.getAccountInfo(getClusterAccAddress(offset));
      const mempoolInfo = await connection.getAccountInfo(mempool);
      
      console.log('');
      console.log('📋 On-chain verification:');
      console.log('  Cluster account:', clusterInfo ? `✅ Exists (${clusterInfo.data.length} bytes)` : '❌ Not found');
      console.log('  Mempool account:', mempoolInfo ? `✅ Exists (${mempoolInfo.data.length} bytes)` : '❌ Not found');
      
      return;
    }
  }

  console.log('❌ Could not find matching offset in range 0-500');
  console.log('');
  console.log('The mempool address DNDMoeo2ZyCwaGZeF1P7N7kN2HW17zLiURgvaLWUovjs');
  console.log('may be from a custom cluster or different Arcium version.');
}

main().catch(console.error);
