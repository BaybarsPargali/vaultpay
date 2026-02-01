# Arcium Blueprints (project specs)

These are “ready-to-build” project outlines that show what Arcium enables and how to structure an MXE + Solana program + TypeScript client.

Each blueprint includes:
- goal
- what is public vs private
- minimal instruction set
- invariants (security rules)
- testing plan

---

## Blueprint 1 — Private sealed-bid auction (simple + powerful)

### Goal
Run an auction where bids stay private until the reveal/finalization stage.

### Why Arcium
- prevents bid leakage
- prevents copy-bidding
- keeps losing bids private

### Roles
- Seller: creates the auction
- Bidders: submit private bids

### Public vs private

Public (on Solana):
- auction config (start/end time, min bid, token mint)
- commitments (hashes) or references to encrypted bids
- final winner (winner pubkey + winning amount)

Private (inside MXE/MPC):
- each bidder’s bid amount
- ranking of bids until final

### Minimal instruction set

Solana program instructions:
- `create_auction(config)`
- `submit_bid(ciphertext, computation_offset, ...)` (queues MPC)
- `bid_callback(result)` (stores commitment / updates auction state)
- `finalize_auction()` (computes winner, settles funds)

Confidential instructions (Arcis):
- `record_bid(Enc<Shared/Mxe, BidInput>) -> Enc<Mxe, BidReceipt>`
- `compute_winner(...) -> Enc<Mxe, Winner>`

### Invariants (must always hold)
- Only accept bids during the bid window.
- A bidder can’t overwrite someone else’s bid.
- Finalization happens once.
- Settlement transfers are consistent with the winner result.

### Testing plan
- Unit: bid window checks, idempotency, state transitions.
- Integration: multiple bidders submit bids; finalize picks correct winner.
- Adversarial: double-submit same `computation_offset`, reorder callbacks.

---

## Blueprint 2 — Private order book (dark-pool style, “lite”)

### Goal
Users place private orders; matching happens without revealing the full book.

### Why Arcium
- reduces front-running opportunities
- hides trade intent and order sizes

### Public vs private

Public:
- market config (base/quote mints)
- escrow/vault accounts
- trade receipts / filled volume (optional)

Private:
- outstanding orders (price/size)
- matching logic and “best price” selection

### Minimal instruction set

Solana program instructions:
- `init_market()`
- `deposit_to_vault(user, amount)`
- `place_order(ciphertext, computation_offset, ...)` (queues MPC)
- `match_orders()` (queues MPC match step)
- `match_callback(result)` (settles fills)
- `withdraw_from_vault(user, amount)`

Confidential instructions:
- `place_order_private(...)` (adds order to private state)
- `match_private(...)` (computes matched pairs + fills)

### Invariants
- Never allow settlement without sufficient vault funds.
- Prevent replay: each fill is applied once (idempotent fill IDs).
- Match results must be verifiable/consistent with vault deltas.

### Testing plan
- Integration: place N orders, match, verify vault balances.
- Load: queue many orders; ensure callback ordering doesn’t break state.

---

## Blueprint 3 — Private scoring / eligibility gate

### Goal
Compute a score/eligibility result from private inputs, and reveal only:
- “eligible yes/no” or
- a bounded score

### Why Arcium
- users don’t expose raw data
- the app doesn’t need to store sensitive user details

### Examples
- credit-like eligibility checks
- reputation gating
- “proof of attributes” style flows (without revealing attributes)

### Public vs private

Public:
- user identity pubkey
- final decision (boolean) or score range

Private:
- user features (income bracket, transaction history features, etc.)
- model weights if you want them hidden

### Minimal instruction set

Solana program instructions:
- `init_policy(policy_hash, params)`
- `submit_features(ciphertext, computation_offset, ...)` (queues MPC)
- `score_callback(result)` (stores eligible/score)

Confidential instructions:
- `score_user(Enc<Shared, Features>) -> Enc<Shared, ScoreResult>`

### Invariants
- Ensure results are tied to the correct user public key.
- Ensure `computation_offset` uniqueness per request.
- Avoid storing sensitive features on-chain.

### Testing plan
- Unit: boundary cases, deterministic scoring.
- Integration: multiple users submit; confirm correct mapping user → decision.

---

## How to pick a first blueprint

- Want fast win: Auction
- Want DeFi-grade complexity: Order book
- Want real-world utility with minimal settlement complexity: Scoring gate
