import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Your cluster offset from mxe-info
  const clusterOffset = 53456743;
  
  // Try different seed formats
  const seeds = [
    [Buffer.from("cluster"), Buffer.alloc(4).fill(0)], // offset as 4 bytes LE
    [Buffer.from("cluster"), Buffer.from(new Uint32Array([clusterOffset]).buffer)],
  ];
  
  // Set the offset properly
  const offsetBuf = Buffer.alloc(4);
  offsetBuf.writeUInt32LE(clusterOffset);
  
  const [clusterPda1] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), offsetBuf],
    ARCIUM_PROGRAM_ID
  );
  
  console.log("Cluster offset:", clusterOffset);
  console.log("Cluster PDA (4-byte LE):", clusterPda1.toBase58());
  
  const info1 = await connection.getAccountInfo(clusterPda1);
  console.log("Exists:", !!info1);
  
  // Also try 8-byte offset (u64)
  const offsetBuf8 = Buffer.alloc(8);
  offsetBuf8.writeBigUInt64LE(BigInt(clusterOffset));
  
  const [clusterPda2] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), offsetBuf8],
    ARCIUM_PROGRAM_ID
  );
  
  console.log("\nCluster PDA (8-byte LE):", clusterPda2.toBase58());
  const info2 = await connection.getAccountInfo(clusterPda2);
  console.log("Exists:", !!info2);
  
  // Check if maybe the cluster is stored differently - by pubkey
  console.log("\n\nSearching for any cluster accounts owned by Arcium...");
  
  // Let's also check the MXE account's referenced cluster directly
  const MXE_ACCOUNT = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");
  const mxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
  
  if (mxeInfo) {
    // Cluster reference might be stored as a pubkey at some offset
    for (let offset of [72, 104, 136, 168]) {
      if (offset + 32 <= mxeInfo.data.length) {
        const possibleCluster = new PublicKey(mxeInfo.data.slice(offset, offset + 32));
        if (!possibleCluster.equals(PublicKey.default)) {
          console.log(`\nPossible cluster at byte ${offset}: ${possibleCluster.toBase58()}`);
          const clusterInfo = await connection.getAccountInfo(possibleCluster);
          if (clusterInfo) {
            console.log(`  ✅ EXISTS! Size: ${clusterInfo.data.length} bytes`);
            console.log(`  Owner: ${clusterInfo.owner.toBase58()}`);
          }
        }
      }
    }
  }
}

main().catch(console.error);
