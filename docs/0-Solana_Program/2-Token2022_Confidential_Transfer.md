# Token-2022 Confidential Transfer - Official Documentation

> **Source:** [solana-program.com/docs/confidential-balances](https://www.solana-program.com/docs/confidential-balances)  
> **Last Updated:** January 14, 2026  
> **Token-2022 Program ID:** `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

---

## Overview

The Token-2022 program provides confidential transfer functionality through the confidential transfer extension. Transfer amounts are encrypted using Twisted ElGamal encryption, and zero-knowledge proofs verify the validity of transfers without revealing the amounts.

---

## Key Concepts

### Encryption Scheme: Twisted ElGamal

Token-2022 uses a modified ElGamal encryption scheme with Pedersen commitments:

- **48-bit amount limit:** Transfer amounts must fit in 48 bits (max ~281 trillion smallest units)
- **Split encoding:** 48 bits split into 16-bit low + 32-bit high for efficient decryption
- **Discrete log recovery:** Decryption requires solving discrete log (slow for large values)

### Required Zero-Knowledge Proofs

1. **Range Proof (Bulletproofs)** - Proves amount is non-negative and within range
2. **Equality Proof** - Proves sender/recipient ciphertexts encrypt same value
3. **Validity Proof** - Proves ciphertext is mathematically well-formed
4. **Zero Balance Proof** - Proves account has zero balance (for closing)

### Account States

- **Non-Confidential Balance:** Regular visible token balance
- **Pending Balance:** Incoming confidential transfers (not yet available)
- **Available Balance:** Confidential balance ready for transfers

---

## CLI Commands Reference

### 1. Create Mint with Confidential Transfers

```bash
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  create-token --enable-confidential-transfers auto
```

**Approve Policies:**
- `auto` - Any user can enable CT on their account
- `manual` - Admin must approve each user for CT

**⚠️ Important:** CT must be enabled at mint creation, cannot be added later.

### 2. Create Token Account

```bash
spl-token create-account <MINT_PUBKEY>
```

### 3. Configure Account for Confidential Transfers

```bash
spl-token configure-confidential-transfer-account --address <ACCOUNT_PUBKEY>
```

**Note:** Only account owner can configure CT (sets encryption key).

### 4. Deposit to Confidential Balance

```bash
spl-token deposit-confidential-tokens <MINT_PUBKEY> <AMOUNT> --address <ACCOUNT_PUBKEY>
```

Moves tokens from non-confidential to confidential balance.

### 5. Apply Pending Balance

```bash
spl-token apply-pending-balance --address <ACCOUNT_PUBKEY>
```

Moves incoming transfers from "pending" to "available" balance.

### 6. Confidential Transfer

```bash
spl-token transfer <MINT_PUBKEY> <AMOUNT> <DESTINATION_PUBKEY> --confidential
```

**Note:** Takes a few seconds due to multiple dependent transactions.

### 7. Withdraw from Confidential Balance

```bash
spl-token withdraw-confidential-tokens <MINT_PUBKEY> <AMOUNT> --address <ACCOUNT_PUBKEY>
```

Moves tokens back to non-confidential balance.

---

## JavaScript/TypeScript SDK Status

### Current State (January 2026)

| Package | Status | Notes |
|---------|--------|-------|
| `@solana/spl-token` | ❌ No CT support | Basic Token-2022, no CT functions |
| `@solana-program/token-2022` | 🟡 web3.js v2 only | Not compatible with v1 projects |
| `spl-token-confidential-transfer-proof-generation` | ✅ Rust only | Crates.io, no npm |

### Recommended Approaches

1. **CLI Integration (Recommended)**
   ```typescript
   import { exec } from 'child_process';
   
   function confidentialTransfer(mint: string, amount: string, dest: string) {
     return new Promise((resolve, reject) => {
       exec(
         `spl-token transfer ${mint} ${amount} ${dest} --confidential`,
         (error, stdout, stderr) => {
           if (error) reject(error);
           else resolve(stdout);
         }
       );
     });
   }
   ```

2. **WASM Compilation** (Complex)
   - Compile Rust crate to WASM
   - Use wasm-pack or similar tooling
   - Significant engineering effort

3. **Wait for Official SDK** (Cleanest)
   - Monitor `@solana/spl-token` releases
   - Check Solana Labs announcements

---

## Program Addresses

| Program | Address | Notes |
|---------|---------|-------|
| Token-2022 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | Mainnet & Devnet |
| ZK Token Proof | *Native Solana runtime* | Not a separate program |

**⚠️ Note:** ZK proofs are verified by the Solana runtime natively, not a separate deployed program. References to `ZkTokenProof1111111111111111111111111111111` are placeholders.

---

## Cryptographic Details

### ElGamal Keypair

Each account configured for CT has an ElGamal keypair:
- **Public Key:** 32 bytes, stored on-chain in account extension data
- **Secret Key:** 32 bytes, stored locally by user (never on-chain)

### Ciphertext Format

Each encrypted amount consists of:
- **Commitment:** 32 bytes (Pedersen commitment)
- **Handle:** 32 bytes (ElGamal handle for decryption)
- **Decryptable Amount (AEK):** 36 bytes (AES-encrypted for fast decryption)

### Amount Splitting

48-bit amounts are split for efficient proof generation:
- **Low bits:** 16 bits (for range proof efficiency)
- **High bits:** 32 bits

---

## VaultPay Integration Notes

### Current Implementation

VaultPay uses custom TypeScript implementations:
- `src/lib/confidential/crypto/twisted-elgamal.ts` - Custom ElGamal using @noble/curves
- `src/lib/confidential/crypto/zk-proofs.ts` - Simplified proofs (not Bulletproofs)
- `src/lib/confidential/ct-payment-service.ts` - Transaction building

### Production Upgrade Path

1. **Phase 1 (Current):** CLI bridge for devnet testing
2. **Phase 2:** WASM-compiled Rust proofs or Arcium C-SPL
3. **Phase 3:** Official SDK when available

### Files to Update When SDK Available

Search for `[SOLANA-SDK-DEP]` tags:
```bash
grep -r "SOLANA-SDK-DEP" src/
```

---

## Resources

- **Official Docs:** https://www.solana-program.com/docs/confidential-balances
- **Encryption Deep Dive:** https://www.solana-program.com/docs/confidential-balances/encryption
- **ZK Proofs Overview:** https://www.solana-program.com/docs/confidential-balances/zkps
- **GitHub Repo:** https://github.com/solana-program/token-2022
- **Rust Crate:** https://crates.io/crates/spl-token-confidential-transfer-proof-generation
- **CLI Examples:** https://github.com/solana-labs/solana-program-library/tree/master/token/cli/examples
