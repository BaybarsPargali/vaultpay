# Arcium Glossary (ELI10 + practical)

This is a quick “decode the jargon” sheet for Arcium development.

---

## Core concepts

### Arcium
A confidential computing network that lets you run computations on encrypted data using Multi-Party Computation (MPC). Solana is used as the coordination/verification layer.

### MPC (Multi-Party Computation)
A way for multiple nodes to jointly compute a result without any node learning the plaintext inputs.

### MXE (MPC eXecution Environment)
Your “private compute app”. An MXE is the unit of deployment/execution for confidential instructions.

- Disposable MXE: one-shot computation, no long-lived private state.
- Persistent MXE: maintains evolving private state across sessions.

### Arx Node
A node operator machine participating in MPC computations.

### Cluster
A group of Arx Nodes assigned to execute computations for an MXE.

### Orchestrator (on Solana)
The on-chain component that queues computations, emits events, and coordinates execution/finalization.

---

## Developer workflow terms

### Confidential instruction
A function that runs under MPC on encrypted inputs (written using Arcis), rather than running directly in the Solana VM.

### Arcis
A Rust framework used to write confidential instructions.

### `#[encrypted]`
Rust attribute marking a module that contains confidential MPC code.

### `#[instruction]`
Marks a function as an MPC entry point that becomes a callable circuit.

### `Enc<..., T>`
Arcium encrypted value wrapper.

Common modes:

- `Enc<Shared, T>`: encrypted with a shared secret between the client and MXE (both can decrypt).
- `Enc<Mxe, T>`: only the MXE can decrypt (client cannot).

---

## “Offsets” and identifiers (what they are, why they exist)

### `computation_offset`
A unique identifier for one computation request.

Practical rule: generate a fresh random value per computation. Treat it like a unique request ID.

### `cluster_offset`
An identifier for a cluster (often used to derive PDAs or select a cluster on devnet/testnet).

### `comp_def_offset` / computation definition offset
A stable identifier for a confidential instruction definition (e.g., derived from the instruction name).

Practical rule: the string you use here must match the confidential instruction’s name exactly.

---

## Accounts & queues (Arcium-side on Solana)

These are “coordination accounts” used to manage parallel computation and state transitions.

### Mempool
A queue of pending computations, typically prioritized by fees.

### Executing pool
An account (or set of accounts) that tracks computations currently executing in parallel.

### Computation account
An account representing the lifecycle/state of a single computation (queued → executing → finalized).

---

## Crypto and client terms

### x25519 key exchange
A method used to derive a shared secret between the client and the MXE.

### Shared secret
A secret derived from x25519 that becomes the basis for encryption keys.

### Cipher (e.g., `RescueCipher`)
Used by the client to encrypt inputs and decrypt outputs.

### Nonce
A small fixed-size random value required by many encryption schemes.

Practical rule:
- Keep nonce size exactly as expected by the SDK.
- Never reuse the same nonce with the same key for multiple encryptions.

---

## Callback and finalization

### Callback instruction
A Solana instruction invoked when MPC nodes return results. This is where you:

- verify the result is valid
- update on-chain state
- emit events

### Finalization
The point at which the computation is confirmed complete and its output is accepted.

### Callback server (large output pattern)
If outputs exceed Solana transaction limits, Arcium can deliver the remainder to your server, and you finalize on-chain by submitting a hash/verification.

---

## Trust model terms (high level)

### Honest-but-curious
Nodes follow the protocol but may try to infer information from what they see.

### Dishonest majority
Assume most participants could be malicious; requires stronger protections.

---

## Quick “which doc do I read?”

- Want architecture/trust model: `0-Arcium_General.md`
- Want setup/how-to: `3-Arcium_Step_By_Step_Development.md`
- Want TS client code flow: `2-Arcium_TypeScript_SDK_API_Ref.md`
