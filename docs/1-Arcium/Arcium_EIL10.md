# Arcium ELI10: What’s in this folder + what you can build

Arcium is basically: **“do computations on private data, without anyone ever seeing the private data”** — while still using Solana for coordination and on-chain results.

This file is a normie-friendly map of what’s in `docs/1-Arcium/` and what the possibilities are.

---

## The 60-second mental model (Arcium in plain English)

- Your users have sensitive inputs (balances, orders, health data, features for ML, etc.).
- Normally you must **decrypt** to compute → someone can leak it.
- With Arcium, users **encrypt** inputs, and a network of MPC nodes computes on them.
- The result is returned to your Solana program via a **callback**, and then your app reacts.

Two important ideas:

- **Solana = coordination + state + verification layer**
- **Arcium = encrypted computation layer**

---

## Key terms (ELI10)

- **MXE**: Your “private compute app” (MPC eXecution Environment).
- **Arx Nodes**: The machines doing the MPC work.
- **Cluster**: A group of Arx Nodes that run an MXE.
- **Arcis**: The Rust framework where you write confidential instructions.
- **Confidential instruction**: A function that runs under MPC on encrypted data.
- **Queue → Execute → Callback**: The basic lifecycle.

---

## What’s in this folder

### 0-Arcium_General.md

Think of this as the “deep architecture / why it works” document.

What you get from it:

- Why Arcium is “Privacy 2.0” (shared private state, not just hiding a single user)
- The building blocks: MPC + (some) FHE + (some) ZK + (optional) TEE
- The architecture:
  - arxOS (distributed execution orchestration)
  - MXEs (Disposable vs Persistent)
  - Clusters of Arx Nodes
- The trust/performance modes:
  - **Cerberus**: stronger adversary model, slower
  - **Manticore**: faster, different trust assumptions

When to read it:
- When you’re deciding threat model, architecture, or explaining Arcium to a technical audience.

---

### 1-Arcium_Development.md

Think of this as “developer onboarding + official docs dump”.

It covers:

- What Arcium enables (private DeFi, secure AI, confidential gaming)
- How the dev experience works:
  - `arcium` CLI (Anchor-like)
  - writing confidential instructions in Rust
  - Solana program that queues computations
  - optional callback server for large outputs
- Important practical note: **Windows isn’t officially supported** → use **WSL2**.

When to read it:
- When you’re setting up your environment and want the big-picture workflow.

---

### 2-Arcium_TypeScript_SDK_API_Ref.md

Think of this as “how the client encrypts / submits / decrypts”.

It covers the standard client flow:

1. Configure Anchor provider + program ID
2. Locate cluster account (local env var or cluster offset)
3. Fetch MXE public key
4. Do x25519 key exchange → get a shared secret
5. Encrypt inputs (nonce handling matters)
6. Submit the computation
7. Wait for finalization
8. Decrypt the result

When to read it:
- When you’re implementing the frontend/TS client and want the exact SDK calls.

---

### 3-Arcium_Step_By_Step_Development.md

Think of this as “the repo’s Arcium learning path”.

It’s the practical roadmap:

- Environment (WSL2 on Windows)
- `arcium init` project structure
- Writing your first confidential instruction with Arcis
- Wiring the Solana side: init → queue → callback
- Local testing (golden path)
- Moving to devnet/testnet
- Handling large outputs via callback server
- Production patterns (reliability, circuit management, observability)

When to read it:
- First, if your goal is to build.

---

## What can you build with Arcium (possibilities)

### 1) Private DeFi (“no one sees your order until it executes”)

Examples:
- dark pools / private order books
- private RFQ matching
- sealed-bid auctions

Why Arcium helps:
- prevents front-running / leakage of intent
- enables shared private state (many users interact with the same hidden state)

---

### 2) Confidential gaming

Examples:
- card games, strategy games, auctions
- hidden moves, fog-of-war

Why Arcium helps:
- the game can prove fairness while keeping hidden info secret until reveal

---

### 3) Private identity / reputation / compliance logic

Examples:
- scoring models where the score is public, but inputs are private
- eligibility checks without revealing sensitive details

Why Arcium helps:
- compute on encrypted data; only reveal what must be revealed

---

### 4) Secure AI / private inference

Examples:
- inference on sensitive user data (health/finance)
- collaborative/federated style workflows

Why Arcium helps:
- lets you compute without exposing raw features

---

### 5) Enterprise / institutional workflows

Examples:
- private reporting
- risk calculations
- shared analytics across organizations

Why Arcium helps:
- multiple parties contribute data without giving it away

---

## “What does an Arcium app look like?” (a simple lifecycle)

1. User encrypts inputs in the client
2. Your Solana program receives ciphertexts + metadata
3. Your program queues computation to Arcium (cluster/mempool)
4. MPC nodes run the confidential instruction
5. MPC nodes call back your Solana program with the result
6. Your app updates state / emits events / unlocks actions

If results are large:
- you add a callback server to receive the large payload and finalize on-chain.

---

## Practical notes (so you don’t get stuck)

- Windows: plan on **WSL2 + Docker** for a smooth dev loop.
- Do not log secrets:
  - don’t persist x25519 private keys
  - don’t dump plaintext inputs
- Local testing: MXE public keys can be null at startup → use retry logic.

---