import { Connection, PublicKey } from "@solana/web3.js";

const MXE_ACCOUNT = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");
const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Get MXE account data
  const mxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
  if (!mxeInfo) {
    console.log("MXE account not found!");
    return;
  }
  
  console.log("MXE Account Data Length:", mxeInfo.data.length);
  console.log("MXE Account Data (hex):", Buffer.from(mxeInfo.data).toString("hex"));
  
  // The cluster offset is typically at bytes 40-44 (after discriminator + pubkey)
  // Let's try different offsets
  const data = mxeInfo.data;
  
  // Try to find cluster offset at different positions
  for (let pos of [40, 72, 104, 136, 168, 200, 232]) {
    if (pos + 4 <= data.length) {
      const offset = data.readUInt32LE(pos);
      console.log(`\nCluster offset at byte ${pos}: ${offset}`);
      
      // Derive cluster PDA with this offset
      const offsetBytes = Buffer.alloc(4);
      offsetBytes.writeUInt32LE(offset);
      const [clusterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("cluster"), offsetBytes],
        ARCIUM_PROGRAM_ID
      );
      console.log(`  Derived Cluster PDA: ${clusterPda.toBase58()}`);
      
      // Check if it exists
      const clusterInfo = await connection.getAccountInfo(clusterPda);
      if (clusterInfo) {
        console.log(`  ✅ FOUND! Cluster account exists (${clusterInfo.data.length} bytes)`);
        console.log(`\n=== USE THIS IN YOUR .env ===`);
        console.log(`NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET="${offset}"`);
        console.log(`NEXT_PUBLIC_CLUSTER_PDA="${clusterPda.toBase58()}"`);
      }
    }
  }
}

main().catch(console.error);
