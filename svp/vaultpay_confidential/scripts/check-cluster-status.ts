import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const clusterOffset = 53456743;
  const offsetBytes = Buffer.alloc(4);
  offsetBytes.writeUInt32LE(clusterOffset);
  
  const [clusterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), offsetBytes],
    ARCIUM_PROGRAM_ID
  );
  
  console.log("Cluster offset:", clusterOffset);
  console.log("Cluster PDA:", clusterPda.toBase58());
  
  const clusterInfo = await connection.getAccountInfo(clusterPda);
  if (clusterInfo) {
    console.log("\n✅ CLUSTER EXISTS!");
    console.log("   Size:", clusterInfo.data.length, "bytes");
    console.log("   Owner:", clusterInfo.owner.toBase58());
    console.log("   Discriminator:", Buffer.from(clusterInfo.data.slice(0, 8)).toString("hex"));
  } else {
    console.log("\n❌ Cluster PDA not found");
  }
  
  // Also check the account mentioned in error
  const errorAccount = new PublicKey("HnQX6FDkaMQ6LkcpzzqPi2PnVkAVUyywe1ez77jNPfRP");
  const errorInfo = await connection.getAccountInfo(errorAccount);
  if (errorInfo) {
    console.log("\n📋 Account from error (HnQX6FD...):");
    console.log("   Size:", errorInfo.data.length, "bytes");
    console.log("   Owner:", errorInfo.owner.toBase58());
    console.log("   Discriminator:", Buffer.from(errorInfo.data.slice(0, 8)).toString("hex"));
  }
  
  // Check mempool
  const MXE_ACCOUNT = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");
  const [mempoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mempool"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  
  const mempoolInfo = await connection.getAccountInfo(mempoolPda);
  console.log("\n📋 Mempool PDA:", mempoolPda.toBase58());
  console.log("   Exists:", !!mempoolInfo);
  if (mempoolInfo) {
    console.log("   Size:", mempoolInfo.data.length, "bytes");
  }
}

main().catch(console.error);
