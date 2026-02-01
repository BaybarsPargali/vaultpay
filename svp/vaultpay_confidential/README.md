# VaultPay Confidential - Arcium MPC Program

## Overview

This is the Arcium MPC Anchor program for VaultPay. It enables confidential payroll payments using Rescue Cipher encryption via the Arcium MPC network.

## How It Works

VaultPay uses Arcium's Multi-Party Computation (MPC) to:
1. Encrypt payment amounts using Rescue Cipher
2. Process confidential transfers without revealing amounts on-chain
3. Finalize payments with cryptographically verified outputs

## Program IDs

| Network | Program ID |
|---------|------------|
| VaultPay (Devnet) | `ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ` |
| Arcium Program | `F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk` |
| MXE Account | `13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk` |
| CompDef (validate_transfer) | `EGE8e5wb3NQiPb6qx5xAxuoRZSmSQpdB94Zsih5SteEB` |

## Deployment Status ✅

**All components are deployed and verified on Solana Devnet:**

- ✅ VaultPay Program deployed
- ✅ MXE Account initialized (cluster offset: 123)
- ✅ `validate_transfer` CompDef initialized

## Quick Start

```bash
# Install dependencies
yarn install

# Build the program (from WSL2/Ubuntu)
arcium build

# Run tests
arcium test
```

## Devnet Deployment

**IMPORTANT**: Always use `--cluster-offset 123` for devnet deployment.

```bash
# From WSL2/Ubuntu in the vaultpay_confidential directory:

# Full deployment (program + MXE initialization)
arcium deploy --cluster-offset 123 \
  --keypair-path ~/.config/solana/id.json \
  --rpc-url https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# If program is already deployed, only reinitialize MXE:
arcium deploy --cluster-offset 123 \
  --keypair-path ~/.config/solana/id.json \
  --rpc-url https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY \
  --skip-deploy
```

Available cluster offsets on devnet (all v0.5.1):
- `123` (recommended)
- `456`
- `789`

## License

This program is part of VaultPay and is licensed under **GPL-3.0-only**.

See [LICENSE](../../LICENSE) for details.

## Environment Setup

Make sure your `.env` file contains:

```env
NEXT_PUBLIC_ARCIUM_PROGRAM_ID="F3G6Q9tRicyznCqcZLydJ6RxkwDSBeHWM458J7V6aeyk"
NEXT_PUBLIC_VAULTPAY_PROGRAM_ID="ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ"
NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT="13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk"
NEXT_PUBLIC_COMPDEF_VALIDATE_TRANSFER="EGE8e5wb3NQiPb6qx5xAxuoRZSmSQpdB94Zsih5SteEB"
NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET="123"
```

---

# Structure of this project

This project is structured pretty similarly to how a regular Solana Anchor project is structured. The main difference lies in there being two places to write code here:

- The `programs` dir like usual Anchor programs
- The `encrypted-ixs` dir for confidential computing instructions

When working with plaintext data, we can edit it inside our program as normal. When working with confidential data though, state transitions take place off-chain using the Arcium network as a co-processor. For this, we then always need two instructions in our program: one that gets called to initialize a confidential computation, and one that gets called when the computation is done and supplies the resulting data. Additionally, since the types and operations in a Solana program and in a confidential computing environment are a bit different, we define the operations themselves in the `encrypted-ixs` dir using our Rust-based framework called Arcis. To link all of this together, we provide a few macros that take care of ensuring the correct accounts and data are passed for the specific initialization and callback functions:

```rust
// encrypted-ixs/add_together.rs

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

// programs/my_program/src/lib.rs

use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

declare_id!("<some ID>");

#[arcium_program]
pub mod my_program {
    use super::*;

    pub fn init_add_together_comp_def(ctx: Context<InitAddTogetherCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn add_together(
        ctx: Context<AddTogether>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        ciphertext_1: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8(ciphertext_0)
            .encrypted_u8(ciphertext_1)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![AddTogetherCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "add_together")]
    pub fn add_together_callback(
        ctx: Context<AddTogetherCallback>,
        output: SignedComputationOutputs<AddTogetherOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(AddTogetherOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(SumEvent {
            sum: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }
}

#[queue_computation_accounts("add_together", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AddTogether<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
}

#[callback_accounts("add_together")]
#[derive(Accounts)]
pub struct AddTogetherCallback<'info> {
    // ... required accounts
    pub some_extra_acc: AccountInfo<'info>,
}

#[init_computation_definition_accounts("add_together", payer)]
#[derive(Accounts)]
pub struct InitAddTogetherCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
}
```
