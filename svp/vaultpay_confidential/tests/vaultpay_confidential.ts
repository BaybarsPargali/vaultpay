import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { VaultpayConfidential } from "../target/types/vaultpay_confidential";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  buildFinalizeCompDefTx,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

// Cluster configuration
// For localnet testing: null (uses ARCIUM_CLUSTER_PUBKEY from env)
// For devnet: Use your cluster offset (e.g., 123)
const CLUSTER_OFFSET: number | null = null;

/**
 * Gets the cluster account address based on configuration.
 */
function getClusterAccount(): PublicKey {
  const offset = CLUSTER_OFFSET ?? getArciumEnv().arciumClusterOffset;
  return getClusterAccAddress(offset);
}

function getClusterOffset(): number {
  return CLUSTER_OFFSET ?? getArciumEnv().arciumClusterOffset;
}

describe("VaultpayConfidential", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace
    .VaultpayConfidential as Program<VaultpayConfidential>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E,
  ): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const clusterAccount = getClusterAccount();
  const clusterOffset = getClusterOffset();

  it("Initializes confidential transfer computation definition", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing validate_confidential_transfer computation definition...");
    const initSig = await initValidateTransferCompDef(program, owner);
    console.log("CompDef initialized with signature:", initSig);
  });

  it("Executes confidential transfer with SOL", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
    
    // Create a recipient wallet
    const recipient = Keypair.generate();
    console.log("Sender:", owner.publicKey.toBase58());
    console.log("Recipient:", recipient.publicKey.toBase58());

    // Get initial balances
    const senderBalanceBefore = await provider.connection.getBalance(owner.publicKey);
    const recipientBalanceBefore = await provider.connection.getBalance(recipient.publicKey);
    console.log("Sender balance before:", senderBalanceBefore / LAMPORTS_PER_SOL, "SOL");
    console.log("Recipient balance before:", recipientBalanceBefore / LAMPORTS_PER_SOL, "SOL");

    // Get MXE public key for encryption
    const mxePublicKey = await getMXEPublicKeyWithRetry(provider, program.programId);
    console.log("MXE x25519 pubkey fetched");

    // Generate ephemeral keypair for ECDH
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    // Derive shared secret and create cipher
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // Encrypt transfer amount (0.1 SOL = 100_000_000 lamports)
    const transferAmountLamports = BigInt(0.1 * LAMPORTS_PER_SOL);
    const senderBalanceLamports = BigInt(senderBalanceBefore);
    const plaintext = [transferAmountLamports, senderBalanceLamports];

    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt(plaintext, nonce);

    console.log("Transfer amount (encrypted):", transferAmountLamports.toString(), "lamports");

    // Listen for transfer completed event
    const transferEventPromise = awaitEvent("transferCompleted");
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    // Queue the confidential transfer
    console.log("Queueing confidential transfer...");
    const queueSig = await program.methods
      .confidentialTransfer(
        computationOffset,
        Array.from(ciphertext[0]),  // encrypted_amount
        Array.from(ciphertext[1]),  // sender_balance_enc
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString()),
      )
      .accountsPartial({
        sender: owner.publicKey,
        recipient: recipient.publicKey,
        computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
        clusterAccount,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(clusterOffset),
        executingPool: getExecutingPoolAccAddress(clusterOffset),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("validate_confidential_transfer")).readUInt32LE(),
        ),
      })
      .signers([owner])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("Queue TX:", queueSig);

    // Wait for MPC finalization
    console.log("Waiting for MPC finalization...");
    const finalizeSig = await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed",
    );
    console.log("Finalize TX:", finalizeSig);

    // Check the transfer event
    const transferEvent = await transferEventPromise;
    console.log("Transfer completed event received!");
    console.log("  Amount transferred:", transferEvent.amountLamports.toString(), "lamports");

    // Verify balances changed
    const senderBalanceAfter = await provider.connection.getBalance(owner.publicKey);
    const recipientBalanceAfter = await provider.connection.getBalance(recipient.publicKey);
    
    console.log("Sender balance after:", senderBalanceAfter / LAMPORTS_PER_SOL, "SOL");
    console.log("Recipient balance after:", recipientBalanceAfter / LAMPORTS_PER_SOL, "SOL");

    // Recipient should have received the transfer amount
    expect(recipientBalanceAfter).to.be.greaterThan(recipientBalanceBefore);
    console.log("✅ Confidential transfer successful!");
  });

  async function initValidateTransferCompDef(
    program: Program<VaultpayConfidential>,
    owner: anchor.web3.Keypair,
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("validate_confidential_transfer");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId(),
    )[0];

    console.log("CompDef PDA:", compDefPDA.toBase58());

    const sig = await program.methods
      .initValidateTransferCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    // Finalize the computation definition
    const finalizeTx = await buildFinalizeCompDefTx(
      provider,
      Buffer.from(offset).readUInt32LE(),
      program.programId,
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
    finalizeTx.sign(owner);
    await provider.sendAndConfirm(finalizeTx);

    return sig;
  }
});

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 20,
  retryDelayMs: number = 500,
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) {
        return mxePublicKey;
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
    }

    if (attempt < maxRetries) {
      console.log(`Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString())),
  );
}
