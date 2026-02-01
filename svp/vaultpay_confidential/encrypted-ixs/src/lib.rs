use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // =============================================================================
    // VaultPay Confidential Transfer - Arcium MPC Encrypted Instructions
    // =============================================================================
    // 
    // Phase 1 Privacy Implementation:
    // - Auditor sealing: MPC outputs sealed for designated auditor only
    // - Batch payroll: Validate multiple payments in single MPC call
    // =============================================================================

    /// Confidential transfer input - amount is encrypted
    pub struct ConfidentialTransferInput {
        /// Encrypted amount in lamports
        amount_lamports: u64,
        /// Sender's balance for validation (ensures sender has enough)
        sender_balance_lamports: u64,
    }

    /// Output of confidential transfer validation
    /// Returns: [amount_lamports (8 bytes), is_valid (1 byte)]
    pub struct TransferValidation {
        /// The validated amount to transfer (first 8 bytes of output)
        amount_lamports: u64,
        /// Whether the transfer is valid (byte 8 of output)
        is_valid: u8,
    }

    /// Extended input with auditor public key for sealing
    pub struct AuditableTransferInput {
        /// Encrypted amount in lamports
        amount_lamports: u64,
        /// Sender's balance for validation
        sender_balance_lamports: u64,
        /// Payee identifier (for audit trail)
        payee_id: u64,
        /// Payment timestamp (unix seconds)
        timestamp: u64,
    }

    /// Sealed audit result - only auditor can decrypt
    pub struct AuditableTransferResult {
        /// The validated amount
        amount_lamports: u64,
        /// Whether the transfer is valid
        is_valid: u8,
        /// Payee identifier for audit trail
        payee_id: u64,
        /// Payment timestamp
        timestamp: u64,
        /// Validation reason code (0 = success, 1 = insufficient balance, etc.)
        reason_code: u8,
    }

    /// Batch payroll entry
    pub struct BatchPayrollEntry {
        /// Amount in lamports
        amount_lamports: u64,
        /// Payee identifier
        payee_id: u64,
    }

    /// Batch payroll input - up to 10 payments
    pub struct BatchPayrollInput {
        /// Array of payment entries
        entries: [BatchPayrollEntry; 10],
        /// Number of valid entries (1-10)
        entry_count: u8,
        /// Total sender balance
        sender_balance_lamports: u64,
        /// Timestamp for all entries
        timestamp: u64,
    }

    /// Batch validation result
    pub struct BatchPayrollResult {
        /// Bitmap of valid entries (bit N = entry N is valid)
        valid_bitmap: u16,
        /// Total amount if all valid
        total_amount: u64,
        /// Count of valid entries
        valid_count: u8,
        /// Timestamp echoed for verification
        timestamp: u64,
    }

    /// Validate a confidential payroll transfer (original - backward compatible)
    /// The MPC cluster decrypts and validates without revealing the amount
    #[instruction]
    pub fn validate_confidential_transfer(
        input_ctxt: Enc<Shared, ConfidentialTransferInput>
    ) -> Enc<Shared, TransferValidation> {
        let input = input_ctxt.to_arcis();
        
        // Check if sender has enough balance
        let is_valid = if input.sender_balance_lamports >= input.amount_lamports {
            1u8
        } else {
            0u8
        };

        let result = TransferValidation {
            amount_lamports: input.amount_lamports,
            is_valid,
        };

        input_ctxt.owner.from_arcis(result)
    }

    /// Validate a transfer with auditor-sealed output
    /// The result is encrypted specifically for the auditor's public key
    /// Only the auditor can decrypt the validation result
    #[instruction]
    pub fn validate_auditable_transfer(
        input_ctxt: Enc<Shared, AuditableTransferInput>,
        auditor: Shared,
    ) -> Enc<Shared, AuditableTransferResult> {
        let input = input_ctxt.to_arcis();
        
        // Check if sender has enough balance
        let (is_valid, reason_code) = if input.sender_balance_lamports >= input.amount_lamports {
            (1u8, 0u8) // Success
        } else {
            (0u8, 1u8) // Insufficient balance
        };

        let result = AuditableTransferResult {
            amount_lamports: input.amount_lamports,
            is_valid,
            payee_id: input.payee_id,
            timestamp: input.timestamp,
            reason_code,
        };

        // Seal result for the auditor - only they can decrypt
        auditor.from_arcis(result)
    }

    /// Validate a batch of payroll payments in a single MPC call
    /// More efficient than individual calls, and hides timing patterns
    #[instruction]
    pub fn validate_batch_payroll(
        input_ctxt: Enc<Shared, BatchPayrollInput>,
        auditor: Shared,
    ) -> Enc<Shared, BatchPayrollResult> {
        let input = input_ctxt.to_arcis();
        
        let mut total_amount: u64 = 0;
        let mut valid_bitmap: u16 = 0;
        let mut valid_count: u8 = 0;
        
        // Process each entry (up to entry_count)
        let count = if input.entry_count > 10 { 10 } else { input.entry_count };
        
        // Calculate total amount needed
        let mut i: u8 = 0;
        while i < count {
            let entry = &input.entries[i as usize];
            total_amount = total_amount.saturating_add(entry.amount_lamports);
            i += 1;
        }
        
        // Check if sender has enough for all payments
        if input.sender_balance_lamports >= total_amount {
            // All entries are valid
            let mut j: u8 = 0;
            while j < count {
                valid_bitmap |= 1u16 << j;
                j += 1;
            }
            valid_count = count;
        } else {
            // Not enough balance - no entries are valid
            total_amount = 0;
            valid_count = 0;
        }

        let result = BatchPayrollResult {
            valid_bitmap,
            total_amount,
            valid_count,
            timestamp: input.timestamp,
        };

        // Seal batch result for the auditor
        auditor.from_arcis(result)
    }
}
