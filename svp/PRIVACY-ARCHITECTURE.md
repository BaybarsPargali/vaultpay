# VaultPay Privacy Architecture

## 🎉 NEW: Compliance Co-Signer Architecture (v2.0)

**VaultPay now uses the "Compliance Co-Signer" pattern for TRUE end-to-end privacy!**

### The Problem We Solved

The old escrow-based architecture had a **fatal privacy flaw**:

```rust
// OLD (BROKEN): amount_lamports was PLAINTEXT on-chain!
pub fn confidential_transfer(
    amount_lamports: u64,  // ← VISIBLE TO EVERYONE!
) {
    transfer(escrow, amount_lamports);  // ← On Solscan :(
}
```

### The Solution: Co-Signer Pattern

Instead of sending funds through a custom program (which requires plaintext), 
we now use **standard Token-2022 Confidential Transfers** with **Arcium as a required co-signer**.

| Feature | Old (Escrow) | **New (Co-Signer)** |
|---------|--------------|---------------------|
| Transaction Type | Custom Program | **Standard Token-2022** |
| Amount Visibility | PLAINTEXT (u64) | **ENCRYPTED (ElGamal)** |
| Compliance Check | Program logic | **Arcium Co-Signer API** |
| Arcium Role | Escrow Validator | **2-of-2 MultiSig Signer** |

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLIANCE CO-SIGNER FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. USER BUILDS TRANSACTION                                                 │
│     ┌──────────────────────────────────────────────────────────────┐       │
│     │ Token-2022 Confidential Transfer                              │       │
│     │ • Source: User's vault token account                          │       │
│     │ • Destination: Recipient's token account                      │       │
│     │ • Amount: [ELGAMAL ENCRYPTED - NOT VISIBLE]                   │       │
│     │ • Required signers: [User, Arcium Co-Signer]                  │       │
│     └──────────────────────────────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  2. USER SIGNS                                                              │
│     ┌──────────────────────────────────────────────────────────────┐       │
│     │ User wallet signs the transaction                             │       │
│     │ (Partial signature - still needs Arcium)                      │       │
│     └──────────────────────────────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  3. SEND TO ARCIUM CO-SIGNER API                                           │
│     POST /api/payments/cosign                                               │
│     ┌──────────────────────────────────────────────────────────────┐       │
│     │ Arcium receives transaction and:                              │       │
│     │ • Extracts recipient address (the ONLY thing visible)         │       │
│     │ • Queries Range Protocol for compliance                       │       │
│     │ • Amount remains ENCRYPTED (Arcium cannot see it!)            │       │
│     └──────────────────────────────────────────────────────────────┘       │
│                              │                                              │
│                 ┌────────────┴────────────┐                                │
│                 ▼                          ▼                                │
│  4a. COMPLIANT ✅                   4b. NON-COMPLIANT ❌                    │
│     ┌───────────────────────┐         ┌───────────────────────┐            │
│     │ Arcium MPC signs      │         │ Arcium REFUSES to     │            │
│     │ Transaction is now    │         │ sign. Transaction     │            │
│     │ fully signed!         │         │ cannot be submitted.  │            │
│     └───────────────────────┘         └───────────────────────┘            │
│                 │                                                           │
│                 ▼                                                           │
│  5. SUBMIT TO SOLANA                                                        │
│     ┌──────────────────────────────────────────────────────────────┐       │
│     │ Fully signed transaction submitted                            │       │
│     │ ON-CHAIN DATA:                                                │       │
│     │ • Sender: [visible]                                           │       │
│     │ • Recipient: [visible]                                        │       │
│     │ • Amount: [ENCRYPTED - NOT VISIBLE] ✅                        │       │
│     └──────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Privacy Guarantee

**What's visible on-chain:**
- Sender address ✓
- Recipient address ✓
- **Amount: ❌ NEVER VISIBLE** (ElGamal ciphertext only)

**What Arcium sees:**
- Recipient address (for compliance)
- **Amount: ❌ CANNOT SEE** (encrypted in transaction)

### Implementation Files

| File | Purpose |
|------|---------|
| `src/lib/cosigner/index.ts` | Co-signer client and service |
| `src/app/api/payments/cosign/route.ts` | Co-sign API endpoint |
| `src/hooks/useCoSignedPayment.ts` | React hook for payments |

### Usage Example

```typescript
import { useCoSignedPayment } from '@/hooks/useCoSignedPayment';

function PaymentButton({ recipientAddress, amount, orgId }) {
  const { executePayment, isLoading, state } = useCoSignedPayment();

  const handlePay = async () => {
    const result = await executePayment({
      recipientAddress,
      amount,
      organizationId: orgId,
    });

    if (result.success) {
      console.log('Private payment sent:', result.txSignature);
      // Amount is ENCRYPTED on-chain - nobody can see it!
    }
  };

  return (
    <button onClick={handlePay} disabled={isLoading}>
      {state.isCoSigning ? '🔍 Checking compliance...' : '🔒 Pay Privately'}
    </button>
  );
}
```

---

## 🚨 DEPRECATED: Old Escrow Architecture

> **⚠️ The escrow-based architecture below is DEPRECATED due to the privacy flaw.**
> **Use the Co-Signer pattern above instead.**

---

## The Problem With Native SOL Transfers

When you make a payment with native SOL, the transaction shows:
```
Transfer 0.5 SOL to escrow PDA  → VISIBLE ON SOLSCAN
Transfer 0.68 SOL to Arcium fees → VISIBLE ON SOLSCAN
```

**This is NOT a bug in the code - it's a fundamental limitation of how Solana works.**

---

## Why Native SOL Transfers Are Always Visible

1. **Solana's Ledger is Public**: Every SOL transfer is recorded on-chain and visible to everyone
2. **Arcium MPC ≠ Hidden Transfers**: Arcium provides **confidential COMPUTATION**, not hidden transfers
3. **The encrypted data** in program logs IS private - but the actual money movement is not

---

## What Arcium MPC Actually Provides

✅ **Encrypted input data** - The amount in the instruction IS encrypted  
✅ **Confidential validation** - MPC nodes validate without seeing plaintext  
✅ **Private computation** - Compliance checks happen on encrypted data  

❌ **NOT provided**: Hidden SOL/token transfers (that requires Token-2022)

---

## The REAL Solution: Token-2022 Confidential Transfers ✅ IMPLEMENTED

VaultPay now uses Token-2022's Confidential Transfer extension for **truly private amounts**:

### How It Works:
1. ✅ Created Token-2022 mint with `ConfidentialTransferMint` extension
2. ✅ Balances are stored as **ElGamal ciphertexts** (encrypted on-chain)
3. Transfer amounts are encrypted with **zero-knowledge proofs**
4. Only sender, recipient, and optional auditor can see amounts

### On-Chain Visibility:
```
BEFORE (Native SOL):
  Transfer 0.5 SOL to Bob → EVERYONE SEES "0.5 SOL"

AFTER (Token-2022 Confidential):
  ConfidentialTransfer → EVERYONE SEES "encrypted_ciphertext_xyz..."
  Only Bob can decrypt → "0.5 tokens"
```

---

## Implementation Status

### Phase 1: Arcium MPC ✅ COMPLETE
- ✅ Encrypted instruction data using RescueCipher
- ✅ MPC-validated compliance via validate_confidential_transfer
- ✅ x25519 key exchange with MXE public key
- ✅ Queue → Execute → Callback lifecycle
- ✅ Priority fees for network congestion (cu_price_micro)
- ✅ SDK `awaitComputationFinalization` integration
- ✅ **Auditor Sealing** - Seal MPC outputs for auditor decryption
- ✅ **Batch Payroll MPC** - Validate up to 10 payments in single MPC call
- ⚠️ Native SOL amounts visible (blockchain limitation, not code issue)

#### Auditor Sealing (NEW)

Organizations can configure an auditor public key for compliance oversight:

```typescript
// Org admin configures auditor in dashboard
const auditorPubkey = 'base64-encoded-x25519-pubkey';
await updateOrgAuditor(orgId, auditorPubkey, 'Compliance Auditor');

// MPC instruction seals output for auditor
import { ArciumPaymentClient } from '@/lib/arcium/program';

const client = new ArciumPaymentClient(connection, wallet);
const tx = await client.createAuditableTransfer(
  paymentId,
  amountLamports,
  balanceLamports,
  payeeWallet,
  auditorPubkey // x25519 public key
);
```

The sealed output can only be decrypted by the auditor:
```typescript
const decrypted = ArciumPaymentClient.decryptAuditorSealedResult(
  sealedOutput, // from payment.auditorSealedOutput
  auditorSecretKey // 32-byte x25519 secret key
);
// Returns: { paymentId, amountLamports, isValid, payeeId, timestamp, reasonCode }
```

#### Batch Payroll MPC (NEW)

Process multiple payments in a single MPC computation:

```typescript
const entries: BatchPayrollEntry[] = [
  { payeeId: 'payee1', payeeWallet: 'wallet1', amountLamports: BigInt(1_000_000_000) },
  { payeeId: 'payee2', payeeWallet: 'wallet2', amountLamports: BigInt(2_000_000_000) },
  // ... up to 10 entries
];

const tx = await client.createBatchPayroll(
  orgId,
  balanceLamports,
  entries,
  auditorPubkey
);
```

Benefits:
- Single MPC computation for multiple payments (efficiency)
- Reduced transaction fees vs individual payments
- All results sealed for auditor in one operation

### Phase 2: Token-2022 Confidential Transfers ✅ COMPLETE (CLI-BASED)
- ✅ Confidential mint deployed: `Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo`
- ✅ **CLI Bridge** wraps `spl-token` CLI for real ZK proof generation
- ✅ API endpoint: `/api/payments/confidential` with full operations
- ✅ useConfidentialPayment React hook (CLI-based)
- ✅ Real Bulletproof ZK proofs via Rust CLI

#### ✅ CLI-Based Approach is PRODUCTION-CORRECT

**This is NOT a workaround - it's how Solana designed it.**

Why there's no JavaScript SDK for CT proofs:
- Token-2022 CT uses **Bulletproof ZK proofs** - complex cryptographic constructs
- The only implementation exists in the Rust crate: `spl-token-confidential-transfer-proof-generation`
- The `@solana-program/token-2022` JS SDK provides **instruction builders** only
- Those builders expect you to **already have the proofs** - no generation functions

Other projects deploying CT successfully use the same approach:
1. **CLI Bridge** (what VaultPay uses) - wraps `spl-token` CLI
2. **Rust Backend** - server-side proof generation in Rust
3. **WASM Build** - compile Rust crate to WASM (experimental)

VaultPay's CLI Bridge is the production-standard approach.

#### CLI Operations Supported:
```bash
# Configure account for CT
spl-token configure-confidential-transfer-account <mint> <account>

# Deposit tokens to confidential balance
spl-token deposit-confidential-tokens <mint> <amount>

# Confidential transfer (amounts hidden on-chain)
spl-token transfer --confidential <mint> <amount> <recipient>

# Apply pending balance
spl-token apply-pending-balance <mint> <account>

# Withdraw from confidential to public balance
spl-token withdraw-confidential-tokens <mint> <amount>
```

#### Key Implementation Files:
| File | Purpose | Status |
|------|---------|--------|
| `src/lib/confidential/cli-bridge.ts` | CLI wrapper for spl-token | ✅ Production |
| `src/app/api/payments/confidential/route.ts` | REST API endpoints | ✅ CLI-based |
| `src/hooks/useConfidentialPayment.ts` | React hook | ✅ CLI-based |
| `src/lib/confidential/ct-payment-service.ts` | Payment orchestration | ⚠️ DEPRECATED |
| `src/lib/confidential/crypto/zk-proofs.ts` | ZK proof generation | ⚠️ DEPRECATED |

### Phase 3: Arcium C-SPL Integration 🔮 COMING SOON
From Arcium dev team (Q&A January 2026):
> "C-SPL integrates SPL-Token, Token-22, Confidential Transfer Extension, and Arcium Network 
> for programmable, multi-party logic on top of encrypted balances."

When C-SPL ships to devnet:
- Token-2022 for encrypted balances/transfers
- Arcium MPC for confidential compliance validation
- True end-to-end privacy with full programmability

---

## Roadmap Items

### Multi-sig Support (Squads Protocol) 🔮 PLANNED
- Types defined in codebase
- Integration pending Squads SDK compatibility
- Target: 2-of-3 approval for enterprise organizations

### Callback Server 🔮 PLANNED
- Required for MPC outputs larger than ~500 bytes
- Current outputs fit in on-chain accounts
- Will implement if needed for audit logs

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/arcium/program.ts` | Arcium MPC encryption, auditor sealing & batch payroll |
| `src/lib/confidential/index.ts` | Token-2022 CT instruction builders |
| `src/lib/confidential/cli-bridge.ts` | CLI wrapper for spl-token (production ZK proofs) |
| `src/app/api/payments/confidential/route.ts` | Confidential payment API |
| `src/app/api/organizations/route.ts` | Org API with auditor configuration |
| `src/components/org/AuditorConfig.tsx` | Auditor public key configuration modal |
| `src/app/audit/page.tsx` | Audit page with decryption UI |
| `vaultpay_confidential/encrypted-ixs/src/lib.rs` | MPC instructions (auditable transfer, batch payroll) |

---

## Quick Reference: Privacy Levels

| Approach | Amount Visible? | Who Can See? | Auditor Support |
|----------|-----------------|--------------|-----------------|
| Native SOL | YES | Everyone | N/A |
| SPL Token | YES | Everyone | N/A |
| Token-2022 (standard) | YES | Everyone | N/A |
| Token-2022 + Confidential Transfer | **NO** | Sender, Recipient, Auditor | ✅ Built-in |
| Arcium MPC only | YES* | *Amount in tx visible | ✅ Sealed output |
| Arcium MPC + Auditor Sealing | YES* | *Tx visible, MPC output sealed | ✅ Org-configured |
| Token-2022 CT + Arcium C-SPL | **NO** | Full privacy + MPC validation | ✅ Ultimate privacy |

---

## Deployment Checklist

Before deploying for user onboarding:

```bash
# 1. Install spl-token CLI (required for Confidential Transfers)
cargo install spl-token-cli

# 2. Verify CLI is available
spl-token --version

# 3. Set up server keypair for CT operations
export SOLANA_KEYPAIR_PATH=/path/to/your/keypair.json
export SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# 4. Check deployment readiness
npx ts-node scripts/check-deployment.ts

# 5. Regenerate Prisma client
npx prisma generate && npx prisma db push

# 6. Initialize Arcium CompDef (if not done)
npx ts-node scripts/init-arcium.ts

# 7. Build for production
npm run build
```

Required environment variables:
```env
# Arcium MPC
NEXT_PUBLIC_VAULTPAY_PROGRAM_ID=ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ
NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT=13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk
NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET=123
NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Token-2022 Confidential Transfers
NEXT_PUBLIC_CONFIDENTIAL_MINT=Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo
SOLANA_KEYPAIR_PATH=/path/to/server/keypair.json  # Required for CLI Bridge
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Compliance (optional for demo mode)
RANGE_API_KEY=your-range-api-key
```
