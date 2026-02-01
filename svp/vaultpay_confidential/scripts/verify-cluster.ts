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
    console.log("✅ Cluster EXISTS! Size:", clusterInfo.data.length, "bytes");
  } else {
    console.log("❌ Cluster not found");
  }
}

main().catch(console.error);
