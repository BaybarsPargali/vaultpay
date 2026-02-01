import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Arcium Program ID (on devnet)
const ARCIUM_PROGRAM_ID = new PublicKey("F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk");

async function main() {
  console.log("========================================");
  console.log("🚀 VaultPay Devnet Initialization Script");
  console.log("========================================\n");

  // EXPLICIT DEVNET CONNECTION - Don't rely on env vars
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  console.log("📡 Connected to: https://api.devnet.solana.com");

  // Load wallet from project directory or default Solana config
  let walletPath = path.join(__dirname, "../../id.json");
  if (!fs.existsSync(walletPath)) {
    walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  }
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at ${walletPath}. Run 'solana-keygen new' first.`);
  }
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  console.log("👛 Wallet:", wallet.publicKey.toBase58());

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
    console.log("⚠️  Low balance! Run: solana airdrop 2");
  }

  // Create provider with explicit commitment
  const provider = new anchor.AnchorProvider(connection, wallet, { 
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // YOUR LIVE ADDRESSES (deployed with --cluster-offset 123)
  const programId = new PublicKey("ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ");
  const mxeAccount = new PublicKey("13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk");

  console.log("\n📋 Configuration:");
  console.log("   Program ID:", programId.toBase58());
  console.log("   MXE Account:", mxeAccount.toBase58());
  console.log("   Arcium Program:", ARCIUM_PROGRAM_ID.toBase58());

  // Verify the program is deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (!programInfo) {
    throw new Error(`❌ Program ${programId.toBase58()} not found on devnet! Run 'anchor deploy' first.`);
  }
  console.log("   ✅ Program exists on devnet");

  // Verify MXE account exists
  const mxeInfo = await connection.getAccountInfo(mxeAccount);
  if (!mxeInfo) {
    throw new Error(`❌ MXE Account ${mxeAccount.toBase58()} not found on devnet! Check your Arcium setup.`);
  }
  console.log("   ✅ MXE Account exists on devnet");

  // Load IDL dynamically
  const idlPath = path.join(__dirname, "../target/idl/vaultpay_confidential.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`❌ IDL not found at ${idlPath}. Run 'anchor build' first.`);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  // Create program instance
  const program = new Program(idl, provider);

  // =========================================================================
  // Initialize add_together Computation Definition
  // =========================================================================
  console.log("\n========================================");
  console.log("1️⃣  Initializing add_together CompDef...");
  console.log("========================================");

  // Use the exact PDA that Arcium expects (from error logs)
  // This is the address Arcium shows in "Right:" for add_together (offset 0)
  const addTogetherCompDefPda = new PublicKey("5HXG4hXh1PdUyw4W5Xu49feMvSQ6RQu64h8rMXo1Z5Nd");
  console.log("   CompDef PDA:", addTogetherCompDefPda.toBase58());

  // Check if already initialized
  const addTogetherCompDefInfo = await connection.getAccountInfo(addTogetherCompDefPda);
  if (addTogetherCompDefInfo) {
    console.log("   ⏭️  add_together CompDef already initialized, skipping...");
  } else {
    try {
      console.log("   📤 Sending init_add_together_comp_def transaction...");
      
      const tx = await program.methods
        .initAddTogetherCompDef()
        .accounts({
          payer: provider.wallet.publicKey,
          mxeAccount: mxeAccount,
          compDefAccount: addTogetherCompDefPda,
          arciumProgram: ARCIUM_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("   🔗 Transaction Signature:", tx);
      console.log("   ⏳ Waiting for confirmation...");

      // FORCE WAIT FOR FINALIZED CONFIRMATION
      const confirmation = await connection.confirmTransaction(tx, "finalized");
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Verify account was created
      const verifyAccount = await connection.getAccountInfo(addTogetherCompDefPda);
      if (verifyAccount) {
        console.log("   ✅ CONFIRMED: add_together CompDef account exists on devnet!");
        console.log("   📦 Account size:", verifyAccount.data.length, "bytes");
      } else {
        throw new Error("❌ Transaction confirmed but account not found! Check program logic.");
      }
    } catch (error: any) {
      console.error("   ❌ Failed to initialize add_together CompDef:");
      console.error("   ", error.message || error);
      if (error.logs) {
        console.error("   📜 Program logs:");
        error.logs.forEach((log: string) => console.error("      ", log));
      }
    }
  }

  // =========================================================================
  // Initialize validate_confidential_transfer Computation Definition
  // =========================================================================
  console.log("\n========================================");
  console.log("2️⃣  Initializing validate_transfer CompDef...");
  console.log("========================================");

  // Check if the instruction exists in the IDL
  const hasValidateTransfer = idl.instructions?.some(
    (ix: any) => ix.name === "init_validate_transfer_comp_def" || ix.name === "initValidateTransferCompDef"
  );

  if (!hasValidateTransfer) {
    console.log("   ⚠️  init_validate_transfer_comp_def not found in IDL.");
    console.log("   💡 You need to rebuild the program: anchor build && anchor deploy");
    console.log("   📝 The confidential_transfer instruction requires this CompDef.");
  } else {
    // Use the exact PDA that Arcium expects (from error logs)
    // This is the address Arcium shows in "Right:" for validate_transfer (offset 1)
    const validateTransferCompDefPda = new PublicKey("5ny8hR2XkwvwzbVebqzyknse2nfuPkBSxmstifyUTXt3");
    console.log("   CompDef PDA:", validateTransferCompDefPda.toBase58());

    // Check if already initialized
    const validateTransferCompDefInfo = await connection.getAccountInfo(validateTransferCompDefPda);
    if (validateTransferCompDefInfo) {
      console.log("   ⏭️  validate_transfer CompDef already initialized, skipping...");
    } else {
      try {
        console.log("   📤 Sending init_validate_transfer_comp_def transaction...");
        
        const tx = await program.methods
          .initValidateTransferCompDef()
          .accounts({
            payer: provider.wallet.publicKey,
            mxeAccount: mxeAccount,
            compDefAccount: validateTransferCompDefPda,
            arciumProgram: ARCIUM_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        console.log("   🔗 Transaction Signature:", tx);
        console.log("   ⏳ Waiting for confirmation...");

        // FORCE WAIT FOR FINALIZED CONFIRMATION
        const confirmation = await connection.confirmTransaction(tx, "finalized");
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        // Verify account was created
        const verifyAccount = await connection.getAccountInfo(validateTransferCompDefPda);
        if (verifyAccount) {
          console.log("   ✅ CONFIRMED: validate_transfer CompDef account exists on devnet!");
          console.log("   📦 Account size:", verifyAccount.data.length, "bytes");
        } else {
          throw new Error("❌ Transaction confirmed but account not found! Check program logic.");
        }
      } catch (error: any) {
        console.error("   ❌ Failed to initialize validate_transfer CompDef:");
        console.error("   ", error.message || error);
        if (error.logs) {
          console.error("   📜 Program logs:");
          error.logs.forEach((log: string) => console.error("      ", log));
        }
      }
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n========================================");
  console.log("📊 Initialization Summary");
  console.log("========================================");
  
  const finalAddTogetherInfo = await connection.getAccountInfo(addTogetherCompDefPda);
  console.log(`   add_together CompDef:      ${finalAddTogetherInfo ? "✅ EXISTS" : "❌ MISSING"}`);
  console.log(`      PDA: ${addTogetherCompDefPda.toBase58()}`);
  
  if (hasValidateTransfer) {
    // Use the same hardcoded PDA for consistency
    const validateTransferCompDefPda = new PublicKey("5ny8hR2XkwvwzbVebqzyknse2nfuPkBSxmstifyUTXt3");
    const finalValidateInfo = await connection.getAccountInfo(validateTransferCompDefPda);
    console.log(`   validate_transfer CompDef: ${finalValidateInfo ? "✅ EXISTS" : "❌ MISSING"}`);
    console.log(`      PDA: ${validateTransferCompDefPda.toBase58()}`);
  } else {
    console.log(`   validate_transfer CompDef: ⚠️  NOT IN IDL (rebuild needed)`);
  }
  
  console.log("\n💡 Next Steps:");
  console.log("   1. If CompDefs are missing, check the transaction signatures above");
  console.log("   2. Run: solana confirm -v <SIGNATURE> to debug");
  console.log("   3. If IDL is outdated, run: anchor build && anchor deploy");
}

main().catch((err) => {
  console.error("\n💥 FATAL ERROR:");
  console.error(err);
  process.exit(1);
});
