/**
 * Find available Arcium clusters on devnet
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getClusterAccAddress, getMempoolAccAddress, getExecutingPoolAccAddress } from '@arcium-hq/client';

const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Searching for active Arcium clusters on devnet...');
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check first 200 cluster offsets
  const foundClusters: { offset: number; cluster: string; mempool: string; execpool: string }[] = [];
  
  for (let offset = 0; offset <= 200; offset++) {
    const clusterPk = getClusterAccAddress(offset);
    const clusterInfo = await connection.getAccountInfo(clusterPk);
    
    if (clusterInfo && clusterInfo.data.length > 0) {
      const mempool = getMempoolAccAddress(offset);
      const execpool = getExecutingPoolAccAddress(offset);
      
      // Verify mempool exists too
      const mempoolInfo = await connection.getAccountInfo(mempool);
      const execpoolInfo = await connection.getAccountInfo(execpool);
      
      foundClusters.push({
        offset,
        cluster: clusterPk.toBase58(),
        mempool: mempool.toBase58(),
        execpool: execpool.toBase58(),
      });
      
      console.log(`✅ Cluster offset ${offset}:`);
      console.log(`   Cluster:  ${clusterPk.toBase58()} (${clusterInfo.data.length} bytes)`);
      console.log(`   Mempool:  ${mempool.toBase58()} ${mempoolInfo ? '✅' : '❌'}`);
      console.log(`   ExecPool: ${execpool.toBase58()} ${execpoolInfo ? '✅' : '❌'}`);
      console.log('');
    }
    
    // Progress indicator every 50
    if (offset % 50 === 0) {
      process.stdout.write(`Checked ${offset}/200...\r`);
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`Found ${foundClusters.length} cluster(s) on devnet`);
  
  if (foundClusters.length > 0) {
    console.log('');
    console.log('🔧 Use one of these offsets in your .env:');
    foundClusters.forEach(c => {
      console.log(`   NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET="${c.offset}"`);
    });
  } else {
    console.log('');
    console.log('❌ No clusters found! You may need to:');
    console.log('   1. Check if Arcium devnet is active');
    console.log('   2. Register your program with the Arcium team');
    console.log('   3. Use localnet for testing (arcium localnet)');
  }
}

main().catch(console.error);
