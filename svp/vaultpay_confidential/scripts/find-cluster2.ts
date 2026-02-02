import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  console.log("Searching for valid cluster accounts...\n");
  
  // Try common cluster offsets
  for (let offset = 0; offset <= 10; offset++) {
    const offsetBytes = Buffer.alloc(4);
    offsetBytes.writeUInt32LE(offset);
    
    const [clusterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cluster"), offsetBytes],
      ARCIUM_PROGRAM_ID
    );
    
    const clusterInfo = await connection.getAccountInfo(clusterPda);
    if (clusterInfo) {
      console.log(`✅ FOUND! Offset ${offset}:`);
      console.log(`   Cluster PDA: ${clusterPda.toBase58()}`);
      console.log(`   Account size: ${clusterInfo.data.length} bytes`);
      console.log(`\n=== ADD TO .env ===`);
      console.log(`NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET="${offset}"`);
    } else {
      console.log(`❌ Offset ${offset}: ${clusterPda.toBase58()} - not found`);
    }
  }
  
  // Also check MXE-specific cluster derivation
  console.log("\n\nTrying MXE-based cluster derivation...");
  const MXE_ACCOUNT = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");
  
  const [mxeCluster] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  
  const mxeClusterInfo = await connection.getAccountInfo(mxeCluster);
  if (mxeClusterInfo) {
    console.log(`✅ FOUND MXE Cluster: ${mxeCluster.toBase58()}`);
    console.log(`   Account size: ${mxeClusterInfo.data.length} bytes`);
  } else {
    console.log(`❌ MXE Cluster: ${mxeCluster.toBase58()} - not found`);
  }
}

main().catch(console.error);
