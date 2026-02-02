import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");
const TARGET_CLUSTER = new PublicKey("HnQX6FDkaMQ6LkcpzzqPi2PnVkAVUyywe1ez77jNPfRP");

async function main() {
  console.log("Searching for offset that produces cluster:", TARGET_CLUSTER.toBase58());
  console.log("This may take a moment...\n");
  
  // Search in ranges
  const ranges = [
    [0, 1000000],
    [53456000, 53457000],
    [53450000, 53460000],
  ];
  
  for (const [start, end] of ranges) {
    console.log(`Searching range ${start} - ${end}...`);
    for (let offset = start; offset < end; offset++) {
      const offsetBytes = Buffer.alloc(4);
      offsetBytes.writeUInt32LE(offset);
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("cluster"), offsetBytes],
        ARCIUM_PROGRAM_ID
      );
      if (pda.equals(TARGET_CLUSTER)) {
        console.log("\n✅ FOUND!");
        console.log("   Offset:", offset);
        console.log("   Set: NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET=" + offset);
        return;
      }
    }
  }
  
  // Try different seed format - maybe it uses MXE pubkey
  console.log("\nTrying MXE-based derivation...");
  const MXE_ACCOUNT = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");
  
  // Maybe cluster PDA uses MXE + offset
  for (let offset = 0; offset < 1000; offset++) {
    const offsetBytes = Buffer.alloc(4);
    offsetBytes.writeUInt32LE(offset);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cluster"), MXE_ACCOUNT.toBuffer(), offsetBytes],
      ARCIUM_PROGRAM_ID
    );
    if (pda.equals(TARGET_CLUSTER)) {
      console.log("\n✅ FOUND with MXE-based derivation!");
      console.log("   Offset:", offset);
      console.log("   Seeds: ['cluster', MXE_ACCOUNT, offset]");
      return;
    }
  }
  
  console.log("\n❌ Offset not found in searched ranges");
  console.log("The cluster may use a different PDA derivation scheme.");
  console.log("\nAlternative: Use the cluster pubkey directly in your code:");
  console.log("   const CLUSTER_PUBKEY = new PublicKey('HnQX6FDkaMQ6LkcpzzqPi2PnVkAVUyywe1ez77jNPfRP');");
}

main().catch(console.error);
