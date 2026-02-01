# Solana Step-By-Step Development (Beginner → Advanced)

This document is a practical roadmap to go from “I can run the Solana CLI” to “I can design, build, test, deploy, and operate production-grade Solana systems”: on-chain programs, client infrastructure, and (optionally) validator/RPC/indexing operations.

It complements `0-Solana_Introduction.md`, which mostly surveys **existing SPL programs** (Token/Token-2022/ATA/Stake Pool/Memo). This file is about building **your own program + client**.

---

## How to use this roadmap

- Follow in order. Each phase ends with a **deliverable** and a **checklist**.
- Prefer **localnet** for tight loops, **devnet** for integration, and **mainnet** only when you have monitoring + upgrade controls.
- Treat every “exercise” as something you commit to a repo.

---

## Phase 0 — Core concepts (must-know mental model)

### What you must understand

- **Accounts**: data lives in accounts; programs are stateless code.
- **Ownership**: only the owning program can write an account’s data.
- **Signers**: signatures authorize intent; *being a signer is not the same as being an authority*.
- **Program Derived Addresses (PDAs)**: deterministic addresses controlled by programs.
- **Instructions & Transactions**: transactions contain instructions; each instruction has an account list.
- **Runtime rules**: account borrow rules (read/write locks), compute units, CPI, sysvars.

### Deliverable

- You can explain to someone else:
  - why account order matters,
  - why PDAs exist,
  - why “owner” vs “authority” is different.

### Quick reading (high signal)

- Solana docs: programming model + accounts + transactions
- Anchor book (if you choose Anchor)

---

## Phase 1 — Tooling setup (Windows-friendly)

### Install & verify

1. **Solana CLI**
2. **Rust toolchain** (`rustup`, stable)
3. **Node.js** (LTS) + a package manager (`npm`/`pnpm`/`yarn`)
4. **Anchor** (recommended for most app teams)

### Cluster configuration

- Check config:

```bash
solana config get
```

- Switch cluster:

```bash
solana config set --url https://api.devnet.solana.com
```

- Create keypair and fund (devnet/localnet only):

```bash
solana-keygen new
solana airdrop 2
```

### Local validator loop

- Run local validator:

```bash
solana-test-validator
```

- In another terminal:

```bash
solana config set --url http://127.0.0.1:8899
solana airdrop 10
```

### Deliverable

- You can run `solana-test-validator`, airdrop SOL, and send a simple transfer.

### Checklist

- [ ] `solana --version` works
- [ ] `rustc --version` works
- [ ] `anchor --version` works (if using Anchor)
- [ ] You can airdrop on localnet/devnet

---

## Phase 2 — Your first program (Counter)

Goal: build a minimal program with a persistent account.

### Program requirements

- Create an account `Counter { authority, value }`
- `increment` instruction increments value
- Only `authority` can increment

### Recommended path

- Use **Anchor** for the first 3–4 projects unless you have a strong reason not to.
- Learn “native” (non-Anchor) patterns later (Phase 8).

### Deliverable

- A repo with:
  - program
  - tests that run on localnet
  - a small client script that increments and reads the counter

### Checklist

- [ ] Account space is correct (no truncation)
- [ ] `increment` rejects non-authority
- [ ] Tests pass consistently on localnet

---

## Phase 3 — Accounts & PDAs (real Solana state design)

Most production bugs on Solana come from account design and validation.

### Concepts to implement

- PDA derivation with seeds
- Bump handling
- Deterministic addressing for user-specific state

### Exercise: “User Profile” PDA

- Derive `profile_pda = PDA(["profile", user_pubkey])`
- Store:
  - `user_pubkey`
  - `display_name`
  - `created_at`

### Deliverable

- `init_profile` creates the PDA and stores data
- `update_profile` can only be called by the user

### Checklist

- [ ] PDA seeds are stable and documented
- [ ] You validate expected PDA address in the program
- [ ] You understand when to use PDA vs random keypair

---

## Phase 4 — CPIs: calling SPL Token / Token-2022 safely

Most apps will do at least one of:

- Mint tokens
- Transfer tokens
- Manage ATAs
- Use Token-2022 extensions

### Exercise: “Token Gated Counter”

- Require caller to hold at least `N` tokens of a mint to call `increment`
- Use ATA convention
- Read token balance from token account

### Exercise: “Program-owned vault”

- Create a PDA token account (vault)
- Program signs with PDA seeds to transfer out (CPI)

### Checklist

- [ ] You validate the token program ID you expect (Token vs Token-2022)
- [ ] You validate mint and token account relationships
- [ ] You do not assume the user’s ATA exists (create or require)

---

## Phase 5 — System design patterns (Escrow, Marketplace, Staking)

This phase is about structuring state transitions.

### Pattern A: Escrow

- Buyer locks tokens/SOL
- Seller fulfills
- Buyer can cancel under conditions

**Key points**
- Explicit state machine (`Created → Funded → Completed/Cancelled`)
- Timeouts using sysvar clock (careful with assumptions)

### Pattern B: Marketplace listing

- Listing PDA per (seller, mint)
- Vault controlled by PDA
- Fees and royalty handling (if applicable)

### Pattern C: Staking / reward emission

- Global config + per-user position accounts
- Reward math with fixed-point integers

### Deliverable

- Choose ONE pattern and build it end-to-end with tests.

### Checklist

- [ ] Every instruction has explicit preconditions
- [ ] You have a clear authority model
- [ ] You can explain every writable account in every instruction

---

## Phase 6 — Client engineering (TypeScript) beyond “hello world”

### Skills to build

- Building and sending versioned transactions
- Compute budget instructions (priority fees)
- Handling retries, blockhash expiration, and confirmation
- Address Lookup Tables (ALTs) for large account lists

### Exercise: “Batch transactions”

- Batch 10 increments into multiple transactions
- Add compute budget + priority fee
- Add robust confirmation logic

### Checklist

- [ ] You understand `processed` vs `confirmed` vs `finalized`
- [ ] You can simulate before sending
- [ ] You log signatures + relevant accounts for debugging

---

## Phase 7 — Performance & reliability (how real programs survive mainnet)

### Program-side

- Minimize account size and writes
- Avoid unnecessary CPI
- Avoid realloc in hot paths (or gate it carefully)
- Prefer predictable compute usage

### Client-side

- RPC selection and rate limits
- Backoff + idempotency
- Handling partial failures

### Deliverable

- A short “runbook” section in your project README:
  - how to reproduce issues
  - how to rotate keys (dev)
  - how to redeploy upgrades

---

## Phase 8 — Native (non-Anchor) development (core skill for mastery)

Anchor is great, but “full capability” means you can read and write native programs too.

### Goals

- Understand entrypoint, instruction decoding, account deserialization
- Manual account validation
- Custom error types

### Exercise

- Rebuild the Counter program without Anchor.

---

## Phase 9 — Security checklist (use every time)

### Account validation

- [ ] Validate signer expectations
- [ ] Validate account ownership
- [ ] Validate PDA address derivations (seeds/bump)
- [ ] Validate token account ↔ mint ↔ authority relationships
- [ ] Validate writable/readonly requirements

### Common Solana pitfalls

- Missing ownership checks (anyone can pass a malicious account)
- PDA seed collisions or unstable seeds
- Privilege escalation via CPI if you forward accounts incorrectly
- Over-trusting client-provided data

### Deliverable

- Add a `SECURITY.md` (or a section in README) listing invariants per instruction.

---

## Phase 10 — Deployment & upgrades (devnet → mainnet)

### Devnet

- Deploy early to test wallets and explorer flows
- Treat devnet as “integration”, not correctness

### Mainnet readiness

- Upgrade authority controlled by a **multisig**
- Separate keys:
  - deploy authority
  - fee payer
  - operational hot keys

### Checklist

- [ ] Program is reproducibly buildable
- [ ] IDL (if Anchor) is versioned and published appropriately
- [ ] You have a rollback / hotfix plan

---

## Phase 11 — Observability & indexing

### Logs & tracing

- Emit structured program logs for key events
- Log state transitions (escrow created/funded/completed)

### Indexing options

- Basic: poll RPC for signatures / program accounts
- Better: websocket subscriptions
- Production: Geyser-based pipelines / indexing services (choose based on your needs)

### Checklist

- [ ] You can answer: “what happened to tx X?” quickly
- [ ] You can reconstruct state from chain data

---

## Phase 12 — SVM/runtime internals (how Solana really executes)

This phase is about understanding the execution environment well enough to reason about performance, failure modes, and security beyond framework-level abstractions.

### Topics to understand

- The Solana transaction lifecycle at a high level: fetch → verify → schedule → execute → commit
- Compute units, heap/stack constraints, and why instruction design matters
- Rent, account sizing, realloc tradeoffs, and zero-copy patterns
- Syscalls, sysvars, and how programs interact with runtime-provided data

### Exercises

- Take one of your programs and:
  - measure compute usage for each instruction via simulation
  - intentionally exceed compute, then refactor to fit
  - reduce account writes and re-test

### Deliverable

- A short performance note in your project docs:
  - expected compute per instruction
  - hot paths and how you optimized them

---

## Phase 13 — Transaction pipeline & leader schedule (client + infra mastery)

This is the “I can ship reliable high-throughput systems” phase. You don’t need to build a validator to benefit, but you should understand how your transactions are propagated and landed.

### Topics to understand

- Leaders, slots, block production (conceptual)
- Why blockhash expires; how confirmation works under the hood
- Why priority fees matter; compute budget instructions; congestion behavior
- Basic networking concepts for Solana tx sending (RPC vs TPU paths, UDP/QUIC evolution)

### Exercises

- Build a “transaction sender” script/tool that:
  - simulates before sending
  - sets compute budget + priority fee
  - retries safely with backoff
  - records latency stats (submitted → confirmed/finalized)

### Deliverable

- A minimal “tx landing dashboard” (even just CSV + charts) showing:
  - success rate
  - confirmation latency distribution
  - failure reasons grouped

---

## Phase 14 — Running infrastructure: RPC node, private indexing, and validator basics

Full capability on Solana includes being able to operate your own infrastructure when public RPCs or third-party indexers are limiting.

### Path A: RPC-only operations (most teams)

- Run a dedicated RPC endpoint (self-hosted or provider) and learn:
  - health checks
  - request rate limiting
  - websocket subscription scaling
  - log retention and metrics

### Path B: Validator basics (advanced)

- Learn what a validator does conceptually:
  - ledger, snapshots, gossip, voting
  - why stake and voting exist
  - how leader schedule relates to stake and cluster state

### Exercises

- Operate a local “production-like” environment:
  - run `solana-test-validator` with persisted ledger
  - generate load with your tx-sender
  - practice diagnosing failures from logs

### Deliverable

- An ops runbook (1–2 pages):
  - how to bring the node(s) up/down
  - what metrics you watch
  - what logs you keep

---

## Phase 15 — Geyser pipelines (real indexing)

If you want full capability, you should know how to get data out of Solana at scale.

### Topics

- Why `getProgramAccounts` doesn’t scale for everything
- Streaming chain events vs polling
- Geyser concepts (plugins/exporters), and designing idempotent consumers

### Exercises

- Build an indexer that:
  - ingests program logs + account changes
  - stores normalized state in a DB
  - can rebuild from scratch deterministically

### Deliverable

- An “indexer correctness” test:
  - re-index from genesis snapshot (or from a chosen slot range)
  - compare derived state hashes

---

## Phase 16 — Advanced program engineering (production-grade patterns)

### Topics

- Versioning and migrations (account version fields, upgrade-safe layouts)
- Backwards compatibility strategy for clients/IDL
- Permissioned vs permissionless instruction design
- Formalizing invariants per instruction (what must always be true)

### Exercise

- Add account versioning + a migration instruction to one project.

### Deliverable

- A `DESIGN.md` describing:
  - accounts schema + versions
  - state machine transitions
  - invariants per instruction

---

## Capstone projects (pick 1–2)

Pick one capstone and build it like a real product: tests, docs, monitoring, deployment.

1. **Escrow (SOL ↔ SPL)** with timeouts and fees
2. **Token-2022 extension demo** (transfer fee / metadata pointer / etc.)
3. **Staking + rewards** with global config + per-user positions
4. **On-chain order book (mini)** focusing on account design and compute limits
5. **High-throughput tx sender + landing analytics** (client + pipeline mastery)
6. **Indexer (Geyser/websocket) + query API** for one of your programs

---

## Suggested repo structure (per project)

- `programs/<name>/` (on-chain program)
- `tests/` (integration tests)
- `clients/ts/` (scripts + small SDK)
- `docs/` (design notes + invariants)

---

## What to do next

If you tell me which direction you want (DeFi / NFTs / infra / games), I can turn one of the capstones into a concrete step-by-step project plan with:

- accounts schema
- instruction set
- seed conventions
- test plan
- deployment checklist
