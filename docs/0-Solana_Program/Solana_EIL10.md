# Solana ELI10: What’s in this folder + what you can build

If you’re new to Solana, the docs can feel like reading an aircraft manual.
This file is the “normie-friendly map” of what’s in `docs/0-Solana_Program/` and what those building blocks unlock.

---

## The 60-second mental model (Solana in plain English)

- Solana is a **global computer**.
- **Programs** are the apps (smart contracts). They don’t “store state” inside themselves.
- **Accounts** are the database rows. Programs read/write accounts they own.
- A **transaction** is a packet of actions (instructions) signed by users.

So on Solana you don’t deploy “a contract with its own storage”.
You deploy a program, and it manages accounts.

---

## What’s in this folder

### 0-Solana_Introduction.md

Think of this as: “What are the standard Solana programs everyone uses?”
It’s largely a reference / copy of ecosystem and SPL program notes.

What it covers (high level):

- **SPL Token (Token Program)**: the standard for fungible tokens and NFTs.
  - Create mints, create token accounts, mint, transfer, burn
  - Authorities (mint authority, freeze authority), multisigs, wrapping SOL

- **Token-2022 (Token Extensions)**: the “Token Program but upgradeable/extensible”.
  - Same base instructions as SPL Token, plus extensions
  - Extensions unlock features like:
    - transfer fees, interest-bearing tokens
    - non-transferable tokens
    - confidential transfers / confidential mint-burn
    - metadata pointer / on-chain metadata patterns
    - transfer hooks (custom logic on transfers)

- **Associated Token Account (ATA)**: the “default token account” convention.
  - Helps wallets/apps find the correct token account for a user + mint
  - Allows the sender to create the receiver’s ATA (so transfers “just work”)

- **Confidential balances**: Token-2022 feature set for privacy-style flows

- **Stake Pool**: pooling SOL into stake that’s delegated across validators
  - Useful for liquid staking style products

- **Memo**: a tiny program that writes a note into a transaction
  - Commonly used for receipts, tagging, audits, human-readable context

When to read it:
- When you’re building something and you need the “how does SPL Token / Token-2022 / ATA / Stake Pool work?” details.

When not to read it:
- If you’re trying to learn how to build your own program from scratch. Use the step-by-step doc first.

---

### 1-Solana_Step_By_Step_Development.md

Think of this as: “How to go from beginner → advanced builder, step by step.”

It’s a roadmap that covers:

- Building your own **programs** (state, PDAs, validation)
- Calling SPL programs via **CPI** (Token/Token-2022/ATA patterns)
- Designing real systems (escrow/marketplace/staking patterns)
- Writing serious **clients** (transaction reliability, priority fees, ALTs)
- Production topics (security, upgrades, observability)
- “Full capability” topics:
  - runtime internals
  - transaction pipeline + leader/slot concepts
  - RPC ops + validator basics
  - indexing pipelines (including Geyser concepts)

When to read it:
- First. This is the “learning path”.

---

## What can you build on Solana (possibilities)

Below are common product categories, and which building blocks they usually depend on.

### 1) Tokens (the foundation)

You can build:
- meme coins, community tokens
- in-game currencies
- points/loyalty systems
- NFTs (often plus metadata standards)

You’ll use:
- Token Program or Token-2022
- ATAs (almost always)

If you want “fancy token behavior”, Token-2022 is where that lives.

---

### 2) Payments + commerce

You can build:
- subscriptions
- paywalls
- tipping
- streaming payments / vesting

You’ll use:
- Token / Token-2022 transfers
- Memo (for receipts / invoices)
- custom programs for stateful business logic

---

### 3) DeFi primitives

You can build:
- staking systems
- escrow swaps
- AMMs, lending (advanced)

You’ll use:
- vault accounts (often PDAs)
- CPI into Token/Token-2022
- careful math and security checks

---

### 4) Staking + validator ecosystem products

You can build:
- liquid staking frontends
- stake pool analytics
- delegation tools

You’ll use:
- Stake Pool program
- SOL stake accounts + system programs
- indexing (to show user positions and rewards)

---

### 5) Privacy-ish UX and “compliance-friendly” token features

You can build:
- certain confidential transfer workflows (Token-2022)
- tokens with enforced rules (non-transferable, transfer hooks)

You’ll use:
- Token-2022 extensions

---

### 6) Infrastructure (full capability tier)

You can build:
- high-throughput transaction senders
- RPC tooling
- indexers and analytics
- explorer-like views for your program

You’ll use:
- deep understanding of confirmation, blockhashes, priority fees
- websocket subscriptions or Geyser pipelines

---

## A simple “what should I build first?” guide

Pick one based on your goal:

- **I want to launch a token fast** → Start with Token + ATA basics.
- **I want to build dApps** → Start with the Counter → PDA → CPI path.
- **I want to build DeFi** → Build an Escrow + Vault pattern with heavy testing.
- **I want to be infra-level** → Build tx-sender + indexer + monitoring.

---

## Suggested next additions (if you want this repo to be a complete learning pack)

If you want, I can create these next docs too:

- `Solana_Glossary.md` (ELI10 definitions: account, PDA, CPI, rent, etc.)
- `Solana_Program_Security_Checklist.md` (copy/paste checklist per instruction)
- `Solana_Project_Blueprints.md` (ready-to-build project specs: escrow, staking, indexer)
