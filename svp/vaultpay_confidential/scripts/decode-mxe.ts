import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");
const MXE_ACCOUNT = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const mxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
  if (!mxeInfo) {
    console.log("MXE not found");
    return;
  }
  
  const data = mxeInfo.data;
  console.log("MXE Account Analysis:");
  console.log("======================");
  console.log("Total length:", data.length, "bytes");
  console.log("\nDiscriminator (8 bytes):", Buffer.from(data.slice(0, 8)).toString("hex"));
  
  // Try to extract pubkeys from the data
  console.log("\nPossible pubkeys in account:");
  for (let i = 8; i + 32 <= Math.min(data.length, 200); i += 32) {
    const pubkeyBytes = data.slice(i, i + 32);
    // Check if it's not all zeros
    if (pubkeyBytes.some(b => b !== 0)) {
      const pubkey = new PublicKey(pubkeyBytes);
      console.log(`  Bytes ${i}-${i+32}: ${pubkey.toBase58()}`);
      
      // Check if this account exists
      const info = await connection.getAccountInfo(pubkey);
      if (info) {
        console.log(`    ✅ EXISTS (${info.data.length} bytes, owner: ${info.owner.toBase58()})`);
      }
    }
  }
  
  // Check the cluster reference in MXE - offset at byte 64
  console.log("\n\nChecking cluster offset stored in MXE:");
  const clusterOffset = data.readUInt32LE(64);
  console.log("Cluster offset at byte 64:", clusterOffset);
  
  if (clusterOffset > 0 && clusterOffset < 1000000) {
    const offsetBytes = Buffer.alloc(4);
    offsetBytes.writeUInt32LE(clusterOffset);
    const [clusterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cluster"), offsetBytes],
      ARCIUM_PROGRAM_ID
    );
    console.log("Derived cluster:", clusterPda.toBase58());
    
    const clusterInfo = await connection.getAccountInfo(clusterPda);
    console.log("Cluster exists:", !!clusterInfo);
  }
}

main().catch(console.error);
