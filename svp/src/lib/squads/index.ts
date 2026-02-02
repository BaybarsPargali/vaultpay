// src/lib/squads/index.ts
// Squads Multi-sig Integration
// Uses @sqds/multisig SDK for enterprise-grade treasury approvals

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import { connection } from '../solana/connection';

// Types are accessed via multisig.types
const { Permissions, Permission } = multisig.types;

/**
 * Configuration for creating a new multisig
 */
export interface MultisigConfig {
  threshold: number;
  members: {
    address: PublicKey;
    permissions: ('propose' | 'vote' | 'execute')[];
  }[];
  rentCollector?: PublicKey;
}

/**
 * Multisig proposal status
 */
export type ProposalStatus = 
  | 'draft'
  | 'active'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'cancelled';

/**
 * Proposal information
 */
export interface ProposalInfo {
  publicKey: PublicKey;
  index: bigint;
  status: ProposalStatus;
  approvals: PublicKey[];
  rejections: PublicKey[];
  threshold: number;
  createdAt: Date;
}

/**
 * Squads Multisig Manager
 * Handles creation and management of multi-sig treasuries
 */
export class SquadsMultisig {
  private connection: Connection;

  constructor(conn?: Connection) {
    this.connection = conn || connection;
  }

  /**
   * Create a new multisig account
   */
  async createMultisig(
    creator: PublicKey,
    config: MultisigConfig
  ): Promise<{
    transaction: Transaction;
    multisigPda: PublicKey;
    createKey: Keypair;
  }> {
    // Generate a random create key for PDA derivation
    const createKey = Keypair.generate();

    // Derive multisig PDA
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey.publicKey,
    });

    // Convert member permissions
    const members = config.members.map((m) => ({
      key: m.address,
      permissions: Permissions.fromPermissions(
        m.permissions.map((p) => {
          switch (p) {
            case 'propose':
              return Permission.Initiate;
            case 'vote':
              return Permission.Vote;
            case 'execute':
              return Permission.Execute;
          }
        })
      ),
    }));

    // Create the multisig creation instruction
    const createIx = multisig.instructions.multisigCreateV2({
      createKey: createKey.publicKey,
      creator,
      multisigPda,
      configAuthority: null, // No config authority
      timeLock: 0, // No time lock
      threshold: config.threshold,
      members,
      rentCollector: config.rentCollector || null,
      treasury: this.getVaultPda(multisigPda, 0),
      memo: 'VaultPay Multisig Treasury',
    });

    const transaction = new Transaction().add(createIx);

    return {
      transaction,
      multisigPda,
      createKey,
    };
  }

  /**
   * Get the vault PDA for a multisig
   */
  getVaultPda(multisigPda: PublicKey, vaultIndex: number = 0): PublicKey {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda,
      index: vaultIndex,
    });
    return vaultPda;
  }

  /**
   * Create a proposal to execute a transaction
   */
  async createProposal(
    multisigPda: PublicKey,
    proposer: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<{
    transaction: Transaction;
    proposalPda: PublicKey;
    transactionIndex: bigint;
  }> {
    // Get current transaction index
    const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
      this.connection,
      multisigPda
    );
    const transactionIndex = BigInt(Number(multisigAccount.transactionIndex) + 1);

    // Derive proposal PDA
    const [proposalPda] = multisig.getProposalPda({
      multisigPda,
      transactionIndex,
    });

    // Derive transaction PDA
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda,
      index: transactionIndex,
    });

    const transaction = new Transaction();
    
    // Get vault PDA for the message
    const vaultPda = this.getVaultPda(multisigPda, 0);
    const { blockhash } = await this.connection.getLatestBlockhash();

    // Create transaction message using Solana's TransactionMessage
    const txMessage = new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: blockhash,
      instructions,
    });

    // Create vault transaction with the payment instructions
    // vaultTransactionCreate internally converts the TransactionMessage to bytes
    const vaultTransactionIx = multisig.instructions.vaultTransactionCreate({
      multisigPda,
      transactionIndex,
      creator: proposer,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: txMessage,
      memo: 'VaultPay Payment Proposal',
    });

    transaction.add(vaultTransactionIx);

    // Create the proposal
    const proposalIx = multisig.instructions.proposalCreate({
      multisigPda,
      transactionIndex,
      creator: proposer,
    });

    transaction.add(proposalIx);

    // Auto-approve by proposer
    const approveIx = multisig.instructions.proposalApprove({
      multisigPda,
      transactionIndex,
      member: proposer,
    });

    transaction.add(approveIx);

    return {
      transaction,
      proposalPda,
      transactionIndex,
    };
  }

  /**
   * Approve a proposal
   */
  async approveProposal(
    multisigPda: PublicKey,
    transactionIndex: bigint,
    member: PublicKey
  ): Promise<Transaction> {
    const approveIx = multisig.instructions.proposalApprove({
      multisigPda,
      transactionIndex,
      member,
      memo: 'VaultPay approval',
    });

    return new Transaction().add(approveIx);
  }

  /**
   * Reject a proposal
   */
  async rejectProposal(
    multisigPda: PublicKey,
    transactionIndex: bigint,
    member: PublicKey
  ): Promise<Transaction> {
    const rejectIx = multisig.instructions.proposalReject({
      multisigPda,
      transactionIndex,
      member,
      memo: 'VaultPay rejection',
    });

    return new Transaction().add(rejectIx);
  }

  /**
   * Execute an approved proposal
   */
  async executeProposal(
    multisigPda: PublicKey,
    transactionIndex: bigint,
    member: PublicKey
  ): Promise<Transaction> {
    const { instruction } = await multisig.instructions.vaultTransactionExecute({
      connection: this.connection,
      multisigPda,
      transactionIndex,
      member,
    });

    return new Transaction().add(instruction);
  }

  /**
   * Get proposal status and details
   */
  async getProposalInfo(
    multisigPda: PublicKey,
    transactionIndex: bigint
  ): Promise<ProposalInfo | null> {
    try {
      const [proposalPda] = multisig.getProposalPda({
        multisigPda,
        transactionIndex,
      });

      const proposal = await multisig.accounts.Proposal.fromAccountAddress(
        this.connection,
        proposalPda
      );

      // Get multisig for threshold info
      const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
        this.connection,
        multisigPda
      );

      // Determine status
      let status: ProposalStatus = 'active';
      if (proposal.status.__kind === 'Approved') {
        status = 'approved';
      } else if (proposal.status.__kind === 'Rejected') {
        status = 'rejected';
      } else if (proposal.status.__kind === 'Executed') {
        status = 'executed';
      } else if (proposal.status.__kind === 'Cancelled') {
        status = 'cancelled';
      } else if (proposal.status.__kind === 'Draft') {
        status = 'draft';
      }

      return {
        publicKey: proposalPda,
        index: transactionIndex,
        status,
        approvals: proposal.approved.map((k) => new PublicKey(k)),
        rejections: proposal.rejected.map((k) => new PublicKey(k)),
        threshold: multisigAccount.threshold,
        createdAt: new Date(), // Would need to parse from account data
      };
    } catch (error) {
      console.error('[Squads] Error getting proposal info:', error);
      return null;
    }
  }

  /**
   * Get all members of a multisig
   */
  async getMembers(
    multisigPda: PublicKey
  ): Promise<{ address: PublicKey; permissions: string[] }[]> {
    try {
      const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
        this.connection,
        multisigPda
      );

      return multisigAccount.members.map((m) => ({
        address: new PublicKey(m.key),
        permissions: this.parsePermissions(m.permissions),
      }));
    } catch (error) {
      console.error('[Squads] Error getting members:', error);
      return [];
    }
  }

  /**
   * Parse permissions from Squads format
   */
  private parsePermissions(permissions: { mask: number }): string[] {
    const result: string[] = [];
    const mask = permissions.mask;
    
    if (mask & 1) result.push('propose');
    if (mask & 2) result.push('vote');
    if (mask & 4) result.push('execute');
    
    return result;
  }

  /**
   * Check if a member can approve a proposal
   */
  async canApprove(
    multisigPda: PublicKey,
    transactionIndex: bigint,
    member: PublicKey
  ): Promise<boolean> {
    const proposal = await this.getProposalInfo(multisigPda, transactionIndex);
    
    if (!proposal) return false;
    if (proposal.status !== 'active') return false;
    
    // Check if already approved
    const alreadyApproved = proposal.approvals.some((a) => a.equals(member));
    if (alreadyApproved) return false;
    
    // Check if member has vote permission
    const members = await this.getMembers(multisigPda);
    const memberInfo = members.find((m) => m.address.equals(member));
    
    return memberInfo?.permissions.includes('vote') ?? false;
  }
}

// Singleton instance
export const squadsMultisig = new SquadsMultisig();

/**
 * Serialize multisig members for database storage
 */
export function serializeMembers(members: PublicKey[]): string {
  return JSON.stringify(members.map((m) => m.toBase58()));
}

/**
 * Deserialize multisig members from database
 */
export function deserializeMembers(json: string): PublicKey[] {
  const addresses = JSON.parse(json) as string[];
  return addresses.map((a) => new PublicKey(a));
}
