# Arcium Step-by-Step Development Guide (Build to Full Capability)

This document turns the repo’s notes into an end-to-end, developer-focused path: **local → devnet/testnet → production-grade**, including **confidential instructions (Arcis)**, **Solana orchestration**, **TypeScript client encryption**, and **scaling patterns**.

> Target reader: Solana/Anchor developers who want to ship serious Arcium MXEs (MPC eXecution Environments).

---

## 0) Choose your dev environment (Windows note)

Arcium tooling is typically designed for Mac/Linux. If you’re on Windows:

- Recommended: use **WSL2 (Ubuntu)** for Arcium tooling and Docker.
- Keep VS Code on Windows, develop inside WSL (Remote - WSL).

**Checklist**
- [ ] Rust installed
- [ ] Solana CLI **2.3.0** installed
- [ ] Anchor CLI **0.32.1** installed
- [ ] Node.js + Yarn installed
- [ ] Docker + Docker Compose installed

---

## 1) Install Arcium tooling (CLI + node)

On Mac/Linux (or WSL2), install via the official installer:

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
```

Verify:

```bash
arcium --version
```

Why this matters:
- You’ll use `arcium` similarly to `anchor`, but with confidential compute features.
- You’ll run a local Arx node for local testing.

---

## 2) Create an MXE project skeleton

Initialize an Arcium project (an Anchor-like workspace with extra pieces):

```bash
arcium init <project-name>
cd <project-name>
```

Key folders you will use:
- `encrypted-ixs/`: **confidential instructions** (runs under MPC)
- `programs/`: **Solana program** (queues computations, validates outputs)

**Checklist**
- [ ] `Arcium.toml` exists
- [ ] `encrypted-ixs/` contains an example instruction
- [ ] `programs/` contains an `#[arcium_program]` module

---

## 3) Write your first confidential instruction (Arcis)

Confidential logic lives in `encrypted-ixs/` and is marked with `#[encrypted]`. You typically:

1. Define an input struct
2. Expose an MPC entrypoint using `#[instruction]`
3. Use `Enc<Shared, T>` (shared secret between client + MXE) or `Enc<Mxe, T>` (MXE-only)

Example shape (simplified):

```rust
use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct InputValues {
        v1: u8,
        v2: u8,
    }

    #[instruction]
    pub fn add_together(input_ctxt: Enc<Shared, InputValues>) -> Enc<Shared, u16> {
        let input = input_ctxt.to_arcis();
        let sum = input.v1 as u16 + input.v2 as u16;
        input_ctxt.owner.from_arcis(sum)
    }
}
```

**Design guidance (practical)**
- Prefer small, composable confidential instructions.
- Explicitly choose `Shared` vs `Mxe` based on who must decrypt results.
- Keep MPC-friendly arithmetic in mind (avoid heavyweight operations unless needed).

---

## 4) Wire the Solana program: init → queue → callback

In your Solana program (`programs/...`), each confidential instruction typically maps to:

1. `init_<ix>_comp_def`: registers/initializes computation definition (one-time)
2. `<ix>`: queues a computation with encrypted args
3. `<ix>_callback`: verifies outputs and emits events / writes state

Key concepts you’ll see:
- `#[arcium_program]` replaces Anchor’s `#[program]`
- `comp_def_offset("...")` / `getCompDefAccOffset("...")` ties the on-chain comp-def to a circuit name
- `queue_computation(...)` submits the job to the Arcium program/mempool
- Callback verifies outputs and uses cluster/computation accounts to validate

**Queue shape (mental model)**
- Client encrypts inputs + sends ciphertexts and an x25519 pubkey
- Program builds args (encrypted + plaintext metadata like nonce)
- Program calls `queue_computation`

**Callback shape (mental model)**
- MPC cluster returns signed outputs
- Program verifies output against cluster + computation account
- Program emits event (often contains ciphertext + nonce) and/or persists state

---

## 5) Local testing: run a local cluster + execute end-to-end

### 5.1 Start local dependencies

Local Arcium testing generally requires:
- local validator / anchor-style test runner
- local Arx node (Docker)

Your project templates and docs usually provide a working path. Aim for this golden test:

**Golden test (what must succeed)**
- `init_<ix>_comp_def` succeeds once
- Client fetches MXE public key
- Client encrypts inputs
- Program queues computation
- Finalization happens
- Client decrypts output and asserts correctness

### 5.2 TypeScript: encryption → submit → finalize → decrypt

Core flow (from the SDK docs):

1. Set up provider + programId
2. Identify cluster (local uses env)
3. Fetch MXE x25519 pubkey (retry for local startup)
4. Derive shared secret and create a cipher
5. Encrypt inputs (nonce must be correct size)
6. Submit transaction with required Arcium PDAs
7. Await finalization
8. Decrypt result (use nonce rules from your event)

Minimal reference map of important SDK calls:
- Key exchange/cipher: `x25519.*`, `RescueCipher`
- PDAs: `getClusterAccAddress`, `getMXEAccAddress`, `getMempoolAccAddress`, `getExecutingPoolAccAddress`, `getComputationAccAddress`, `getCompDefAccAddress`, `getCompDefAccOffset`
- Lifecycle: `awaitComputationFinalization`
- Local env helper: `getArciumEnv()`

**Common local pitfall**
- MXE keys can be null briefly; use a retry wrapper around `getMXEPublicKey`.

**Security pitfall**
- Never log or persist the client x25519 private key. Keep it in memory until decrypt is done.

---

## 6) Move from local → devnet/testnet safely

Before deploying:

**Checklist**
- [ ] Replace local cluster selection with the correct cluster offset / cluster pubkey
- [ ] Ensure you can re-run `init_<ix>_comp_def` idempotently (or gate it)
- [ ] Use a real RPC endpoint with proper commitments
- [ ] Add robust retry and timeouts around finalization + event listening

Operational notes:
- When Solana is congested, consider priority fees (Arcium supports a `cu_price_micro` pattern in queueing).

---

## 7) Handle larger outputs: callback server pattern

On Solana, callback transactions have tight size limits. If your output can exceed ~1KB:

- MPC cluster returns a partial on-chain payload
- Remaining bytes delivered to your **callback server**
- Server verifies signatures and then calls an on-chain finalize instruction

**When to use**
- Large proofs, large model outputs, batched results

**Checklist**
- [ ] Implement callback server endpoint
- [ ] Verify node signature(s) over the payload
- [ ] Store payload + hash
- [ ] Call on-chain finalize

---

## 8) Production-grade patterns (the “full capability” layer)

### 8.1 Persistent private state

You’ll usually combine:
- **persistent on-chain accounts** for public metadata / commitments
- **encrypted computation outputs** + callback instructions to evolve state

Guidelines:
- Keep public state minimal (hashes, commitments, indexes)
- Keep sensitive state encrypted and updated via MPC callbacks

### 8.2 Circuit management at scale

Large circuits can be MBs, so store them off-chain and verify integrity:

- Build circuit → compute hash
- Upload circuit to public storage
- Embed the expected hash in your on-chain logic

Goal: nodes fetch circuit off-chain but verify it matches the committed hash.

### 8.3 Reliability + observability

Add:
- Metrics: queued computations, finalize latency, failures
- Logs: computation offsets, tx signatures (avoid secrets)
- Alerting: finalize timeout, callback failures

### 8.4 Fee / congestion strategy

- Add configurable priority fee knobs
- Backoff and retry queueing/finalization
- Use multiple RPCs for resilience

---

## 9) Advanced capabilities to explore

Use these when building more complex applications:

- **Key recovery flows** (SDK functions like `initMxePart1`, `initMxePart2`, `recoverMxe`, `submitKeyRecoveryShare`, `finalizeKeyRecoveryExecution`)
- **Multiple instructions / multiple comp defs** per program
- **Batching** (queue multiple computations and finalize asynchronously)
- **Different trust models** (protocol choice like Cerberus vs Manticore; choose based on threat model and performance needs)

---

## 10) Suggested learning/build order (recommended roadmap)

1. **Hello World**: one instruction, one callback, one event, decrypt on client
2. **Stateful app**: store commitments on-chain, evolve state via callbacks
3. **Large output app**: add callback server + finalize path
4. **Performance pass**: priority fees, batching, reduce compute footprint
5. **Hardening**: key management, retries, monitoring, failure handling
6. **Advanced**: key recovery, more complex MPC arithmetic, multi-instruction pipelines

---

## Appendix A: “Golden Path” checklist

- [ ] `arcium init` project created
- [ ] Confidental instruction in `encrypted-ixs/` compiles
- [ ] `init_<ix>_comp_def` works (one-time)
- [ ] `queue_computation` called with correct args + PDAs
- [ ] Callback verifies outputs and emits an event
- [ ] TS client encrypts → submits → awaits finalize → decrypts successfully
- [ ] Devnet/testnet deployment works with non-local cluster config
- [ ] Callback server added if outputs exceed size limits
