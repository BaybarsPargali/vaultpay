import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");

async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    console.log("Searching all Arcium accounts for offset 53456743...");

    const accounts = await connection.getProgramAccounts(ARCIUM_PROGRAM_ID);
    
    for (const { pubkey, account } of accounts) {
        // We search the buffer for the 4-byte and 8-byte versions of your offset
        if (account.data.includes(53456743)) {
            console.log(`\n🎯 MATCH FOUND!`);
            console.log(`Address: ${pubkey.toBase58()}`);
            console.log(`Data Length: ${account.data.length}`);
            return;
        }
    }
    console.log("\n❌ Offset not found in any existing Arcium accounts.");
    console.log("This suggests your cluster was on an older Program ID or a different network.");
}

main().catch(console.error);