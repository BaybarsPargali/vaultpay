# Arcium Security Checklist (practical)

Use this when building any Arcium MXE + Solana program integration.

This is not formal security advice. It’s a practical “don’t ship footguns” list.

---

## 1) Client-side security (encryption + keys)

- [ ] Never log plaintext inputs.
- [ ] Never log or persist the x25519 private key.
- [ ] Keep keys in memory only until decryption finishes.
- [ ] Use correct nonce size exactly as required by the SDK.
- [ ] Never reuse a nonce with the same key.
- [ ] Prefer deriving encryption keys in a recoverable/user-bound way for production (don’t rely on purely random ephemeral secrets unless that is intended).

---

## 2) Request identity + replay protection

- [ ] Treat `computation_offset` as a unique request ID.
- [ ] Enforce “one-time use” of a `computation_offset` per user/operation.
- [ ] Make callbacks idempotent:
  - store a “processed” flag keyed by (computation_offset) or (result hash)
  - ignore duplicates safely

---

## 3) On-chain account validation (Solana program)

In every instruction:

- [ ] Validate required signers.
- [ ] Validate account ownership (who owns this account / which program owns it).
- [ ] Validate PDAs (seeds + bump) and expected derived addresses.
- [ ] Validate writable vs readonly requirements.

For token movement:

- [ ] Validate mint and token-account relationships.
- [ ] Validate token program ID (Token vs Token-2022) explicitly.

---

## 4) Callback validation (most important)

Callbacks are where attackers try to “inject results”.

- [ ] Verify the callback is for the expected computation account.
- [ ] Verify it references the expected cluster and MXE.
- [ ] Verify result authenticity (cluster signatures / expected verification path).
- [ ] Bind result → user/action:
  - include user pubkey (or a commitment to it) in the computation request
  - ensure the callback applies to that same user
- [ ] Enforce state machine transitions:
  - queued → executing → finalized (no skipping)
  - finalized can’t finalize again

---

## 5) Large output pattern (callback server)

If you use an off-chain callback server:

- [ ] Verify node signature(s) over the payload.
- [ ] Store payload hash and compare with on-chain hash.
- [ ] Make finalize step idempotent.
- [ ] Do not accept unauthenticated uploads.
- [ ] Do not trust request origin IP; trust signatures.

---

## 6) Failure modes you must handle

- [ ] MXE public key temporarily missing (local startup) → retry.
- [ ] Computation never finalizes → timeouts + retry policy.
- [ ] Callback arrives late/out of order → idempotent logic.
- [ ] RPC issues / blockhash expiry → robust client send/confirm logic.

---

## 7) Data minimization

- [ ] Put only what you must on-chain.
- [ ] Store commitments/hashes/indexes rather than sensitive data.
- [ ] Be careful with logs: logs are public.

---

## 8) Operational hardening

- [ ] Keep metrics: queued count, finalize latency, callback failures.
- [ ] Alert on stuck computations and high failure rates.
- [ ] Use a multisig for upgrade authority where relevant.

---

## 9) Pre-release checklist

- [ ] Local “golden path” test passes repeatedly.
- [ ] Adversarial tests: duplicate callback, reordered callback, replayed computation_offset.
- [ ] All token movements are covered by tests.
- [ ] You can explain every writable account in each instruction.
