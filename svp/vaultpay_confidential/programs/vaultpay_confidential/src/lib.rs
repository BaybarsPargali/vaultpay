use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

// Computation definition offset for confidential transfer
const COMP_DEF_OFFSET_VALIDATE_TRANSFER: u32 = comp_def_offset("validate_confidential_transfer");

// Escrow PDA seed for holding funds during MPC computation
const ESCROW_PDA_SEED: &[u8] = b"vaultpay_escrow";

declare_id!("ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ");

#[arcium_program]
pub mod vaultpay_confidential {
    use super::*;

    // =========================================================================
    // Initialization Instructions
    // =========================================================================

    pub fn init_validate_transfer_comp_def(ctx: Context<InitValidateTransferCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    // =========================================================================
    // CONFIDENTIAL TRANSFER - Core VaultPay Privacy Feature
    // =========================================================================
    
    /// Execute a confidential payroll transfer
    /// 1. Sender deposits to escrow PDA
    /// 2. MPC cluster validates encrypted amount
    /// 3. Callback releases from escrow to recipient
    pub fn confidential_transfer(
        ctx: Context<ConfidentialTransfer>,
        computation_offset: u64,
        encrypted_amount: [u8; 32],      // Encrypted amount - PRIVATE
        sender_balance_enc: [u8; 32],    // Encrypted balance for validation
        pubkey: [u8; 32],                // x25519 ephemeral public key
        nonce: u128,                     // Encryption nonce
        amount_lamports: u64,            // Plaintext amount for escrow deposit
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        
        // Store escrow bump for callback
        ctx.accounts.escrow_account.bump = ctx.bumps.escrow_account;

        // Step 1: Transfer SOL from sender to escrow PDA
        // This happens BEFORE MPC computation
        let transfer_to_escrow = Transfer {
            from: ctx.accounts.sender.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
        };
        
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_to_escrow,
            ),
            amount_lamports,
        )?;

        // Build encrypted arguments - MPC cluster will decrypt and validate
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(encrypted_amount)
            .encrypted_u64(sender_balance_enc)
            .build();

        // Queue computation to Arcium MPC cluster
        // Callback will release funds from escrow
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ValidateConfidentialTransferCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.escrow_account.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.recipient.key(),
                        is_writable: true,
                    },
                ]
            )?],
            1,
            0,
        )?;

        // Emit event - observers see ONLY encrypted data
        emit!(ConfidentialTransferQueued {
            sender: ctx.accounts.sender.key(),
            recipient: ctx.accounts.recipient.key(),
            encrypted_amount,
            nonce: nonce.to_le_bytes(),
            computation_offset,
            escrow: ctx.accounts.escrow_account.key(),
        });

        Ok(())
    }

    /// Callback from Arcium MPC after validation
    /// This releases SOL from escrow to recipient using PDA signing
    #[arcium_callback(encrypted_ix = "validate_confidential_transfer")]
    pub fn validate_confidential_transfer_callback(
        ctx: Context<ValidateConfidentialTransferCallback>,
        output: SignedComputationOutputs<ValidateConfidentialTransferOutput>,
    ) -> Result<()> {
        let validation = match output.verify_output(
            &ctx.accounts.cluster_account, 
            &ctx.accounts.computation_account
        ) {
            Ok(ValidateConfidentialTransferOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Decode the validated amount from MPC output
        let amount_bytes: [u8; 8] = validation.ciphertexts[0][0..8]
            .try_into()
            .map_err(|_| ErrorCode::AbortedComputation)?;
        let amount_lamports = u64::from_le_bytes(amount_bytes);

        // Check if MPC validated the transfer
        let is_valid = validation.ciphertexts[0][8];
        if is_valid == 0 {
            return Err(ErrorCode::InsufficientBalance.into());
        }

        // Transfer from escrow PDA to recipient using PDA signing
        let escrow_seeds = &[
            ESCROW_PDA_SEED,
            &[ctx.accounts.escrow_account.bump],
        ];
        let signer_seeds = &[&escrow_seeds[..]];

        let transfer_from_escrow = Transfer {
            from: ctx.accounts.escrow_account.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
        };
        
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_from_escrow,
                signer_seeds,
            ),
            amount_lamports,
        )?;

        emit!(TransferCompleted {
            recipient: ctx.accounts.recipient.key(),
            amount_lamports,
            encrypted_amount: validation.ciphertexts[0],
            nonce: validation.nonce.to_le_bytes(),
        });

        Ok(())
    }
}

// =============================================================================
// ESCROW ACCOUNT - Holds funds during MPC computation
// =============================================================================

#[account]
#[derive(Default)]
pub struct EscrowAccount {
    pub bump: u8,
}

// =============================================================================
// CONFIDENTIAL TRANSFER ACCOUNTS
// =============================================================================

#[queue_computation_accounts("validate_confidential_transfer", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ConfidentialTransfer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Sender must sign to authorize the transfer
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// CHECK: Recipient - any valid Solana account
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    
    /// Escrow PDA - holds funds during MPC computation
    #[account(
        init_if_needed,
        space = 8 + 1,  // discriminator + bump
        payer = payer,
        seeds = [ESCROW_PDA_SEED],
        bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VALIDATE_TRANSFER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("validate_confidential_transfer")]
#[derive(Accounts)]
pub struct ValidateConfidentialTransferCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VALIDATE_TRANSFER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    
    /// Escrow PDA - callback releases funds from here
    #[account(
        mut,
        seeds = [ESCROW_PDA_SEED],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    /// CHECK: Recipient of the transfer - passed via callback extra data
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("validate_confidential_transfer", payer)]
#[derive(Accounts)]
pub struct InitValidateTransferCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// =============================================================================
// EVENTS - What observers see on-chain (encrypted only!)
// =============================================================================

#[event]
pub struct ConfidentialTransferQueued {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub encrypted_amount: [u8; 32],  // ENCRYPTED - not readable
    pub nonce: [u8; 16],
    pub computation_offset: u64,
    pub escrow: Pubkey,
}

#[event]
pub struct TransferCompleted {
    pub recipient: Pubkey,
    pub amount_lamports: u64,        // Revealed after MPC validation
    pub encrypted_amount: [u8; 32],  // Original encrypted data
    pub nonce: [u8; 16],
}

// =============================================================================
// ERRORS
// =============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
    #[msg("Insufficient balance")]
    InsufficientBalance,
}
