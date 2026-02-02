// src/hooks/useConfidentialPayment.ts
// React hook for Token-2022 Confidential Transfers via CLI Bridge
//
// ⚠️ REAL IMPLEMENTATION: Uses spl-token CLI for ZK proof generation
// No simulations - requires CLI to be installed on server
//
// The CLI handles:
// - ElGamal keypair generation
// - ZK proof generation (Bulletproofs, Sigma protocols)
// - Transaction building and signing

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { vaultPayFetch } from '@/lib/auth';

// ============================================================================
// Types
// ============================================================================

/**
 * Confidential transfer account status
 */
export interface CTAccountStatus {
  tokenAccount: string | null;
  isConfigured: boolean;
  cliOutput?: string;
  error?: string;
}

/**
 * CLI availability status
 */
export interface CLIStatus {
  available: boolean;
  error?: string;
  requirements?: {
    cli: string;
    env: string;
  };
}

/**
 * Operation result
 */
export interface CTOperationResult {
  success: boolean;
  signature?: string;
  message?: string;
  error?: string;
}

/**
 * Hook state
 */
interface UseConfidentialPaymentState {
  // CLI availability
  cliStatus: CLIStatus | null;
  isCLIAvailable: boolean;
  
  // Account status
  accountStatus: CTAccountStatus | null;
  isConfigured: boolean;
  
  // Loading states
  isLoadingStatus: boolean;
  isConfiguring: boolean;
  isDepositing: boolean;
  isTransferring: boolean;
  isWithdrawing: boolean;
  
  // Mint status
  hasMintAuthority: boolean;
  confidentialMint: string | null;
  
  // Error state
  error: string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing confidential transfers via CLI Bridge
 * 
 * All CT operations are executed server-side via the spl-token CLI.
 * This ensures real ZK proofs are generated (not simulated).
 */
export function useConfidentialPayment() {
  const { publicKey, signMessage, connected } = useWallet();
  
  // State
  const [state, setState] = useState<UseConfidentialPaymentState>({
    cliStatus: null,
    isCLIAvailable: false,
    accountStatus: null,
    isConfigured: false,
    isLoadingStatus: false,
    isConfiguring: false,
    isDepositing: false,
    isTransferring: false,
    isWithdrawing: false,
    hasMintAuthority: false,
    confidentialMint: null,
    error: null,
  });

  // ==========================================================================
  // Status Checking
  // ==========================================================================

  /**
   * Fetch CLI status and account configuration
   */
  const fetchStatus = useCallback(async (): Promise<CTAccountStatus | null> => {
    if (!publicKey) return null;
    
    setState(s => ({ ...s, isLoadingStatus: true, error: null }));
    
    try {
      const path = `/api/payments/confidential?wallet=${publicKey.toBase58()}`;
      const response = await vaultPayFetch({ publicKey, signMessage }, path);
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch status');
      }
      
      const data = result.data;
      
      const cliStatus: CLIStatus = {
        available: data.cliAvailable,
        error: data.cliError,
        requirements: data.requirements,
      };
      
      const accountStatus = data.accountStatus as CTAccountStatus | null;
      
      setState(s => ({ 
        ...s, 
        cliStatus,
        isCLIAvailable: data.cliAvailable,
        accountStatus,
        isConfigured: accountStatus?.isConfigured || false,
        hasMintAuthority: data.hasMintAuthority,
        confidentialMint: data.confidentialMint,
      }));
      
      return accountStatus;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch status';
      setState(s => ({ ...s, error: msg }));
      return null;
    } finally {
      setState(s => ({ ...s, isLoadingStatus: false }));
    }
  }, [publicKey, signMessage]);

  // ==========================================================================
  // Account Operations
  // ==========================================================================

  /**
   * Create token account for the wallet
   */
  const createAccount = useCallback(async (): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    if (!state.isCLIAvailable) {
      return { success: false, error: state.cliStatus?.error || 'CLI not available' };
    }
    
    try {
      const bodyText = JSON.stringify({
        operation: 'create-account',
        wallet: publicKey.toBase58(),
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create account');
      }
      
      toast.success('✅ Token account created!');
      await fetchStatus();
      
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.message,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, [publicKey, signMessage, state.isCLIAvailable, state.cliStatus, fetchStatus]);

  /**
   * Configure account for confidential transfers
   * This generates ElGamal keypair via CLI
   */
  const configureAccount = useCallback(async (): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    if (!state.isCLIAvailable) {
      return { success: false, error: state.cliStatus?.error || 'CLI not available' };
    }
    
    setState(s => ({ ...s, isConfiguring: true, error: null }));
    
    try {
      const bodyText = JSON.stringify({
        operation: 'configure-account',
        wallet: publicKey.toBase58(),
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to configure account');
      }
      
      toast.success('✅ Account configured for confidential transfers!');
      await fetchStatus();
      
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.message,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to configure account';
      setState(s => ({ ...s, error: msg }));
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setState(s => ({ ...s, isConfiguring: false }));
    }
  }, [publicKey, signMessage, state.isCLIAvailable, state.cliStatus, fetchStatus]);

  // ==========================================================================
  // Mint & Deposit
  // ==========================================================================

  /**
   * Request tokens from faucet (devnet only)
   */
  const requestFaucetTokens = useCallback(async (
    amount: number = 100
  ): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    try {
      const bodyText = JSON.stringify({
        operation: 'mint-faucet',
        wallet: publicKey.toBase58(),
        amount,
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Faucet request failed');
      }
      
      toast.success(`💰 Received ${amount} VPAY tokens!`);
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.message,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Faucet failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, [publicKey, signMessage]);

  /**
   * Deposit tokens to confidential balance
   */
  const deposit = useCallback(async (
    amount: number
  ): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    if (!state.isCLIAvailable) {
      return { success: false, error: state.cliStatus?.error || 'CLI not available' };
    }
    
    if (!state.isConfigured) {
      return { success: false, error: 'Configure account first' };
    }
    
    setState(s => ({ ...s, isDepositing: true, error: null }));
    
    try {
      const bodyText = JSON.stringify({
        operation: 'deposit',
        wallet: publicKey.toBase58(),
        amount,
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Deposit failed');
      }
      
      toast.success(`🔒 Deposited ${amount} tokens to confidential balance!`);
      
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.message,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Deposit failed';
      setState(s => ({ ...s, error: msg }));
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setState(s => ({ ...s, isDepositing: false }));
    }
  }, [publicKey, signMessage, state.isCLIAvailable, state.cliStatus, state.isConfigured]);

  // ==========================================================================
  // Confidential Transfer
  // ==========================================================================

  /**
   * Execute a confidential transfer
   * Amount is encrypted on-chain - not visible on explorers!
   */
  const transfer = useCallback(async (
    recipientWallet: string,
    amount: number,
  ): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    if (!state.isCLIAvailable) {
      return { success: false, error: state.cliStatus?.error || 'CLI not available' };
    }
    
    if (!state.isConfigured) {
      return { success: false, error: 'Configure account first' };
    }
    
    setState(s => ({ ...s, isTransferring: true, error: null }));
    
    try {
      const bodyText = JSON.stringify({
        operation: 'transfer',
        wallet: publicKey.toBase58(),
        recipient: recipientWallet,
        amount,
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }
      
      toast.success(`🔒 Confidential transfer complete! Amount is encrypted on-chain.`);
      
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.privacyNote,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Transfer failed';
      setState(s => ({ ...s, error: msg }));
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setState(s => ({ ...s, isTransferring: false }));
    }
  }, [publicKey, signMessage, state.isCLIAvailable, state.cliStatus, state.isConfigured]);

  // ==========================================================================
  // Withdraw
  // ==========================================================================

  /**
   * Withdraw from confidential balance to regular balance
   */
  const withdraw = useCallback(async (
    amount: number
  ): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    if (!state.isCLIAvailable) {
      return { success: false, error: state.cliStatus?.error || 'CLI not available' };
    }
    
    setState(s => ({ ...s, isWithdrawing: true, error: null }));
    
    try {
      const bodyText = JSON.stringify({
        operation: 'withdraw',
        wallet: publicKey.toBase58(),
        amount,
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Withdraw failed');
      }
      
      toast.success(`✅ Withdrawn ${amount} tokens from confidential balance!`);
      
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.message,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Withdraw failed';
      setState(s => ({ ...s, error: msg }));
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setState(s => ({ ...s, isWithdrawing: false }));
    }
  }, [publicKey, signMessage, state.isCLIAvailable, state.cliStatus]);

  /**
   * Apply pending balance to available balance
   */
  const applyPendingBalance = useCallback(async (): Promise<CTOperationResult> => {
    if (!publicKey) {
      return { success: false, error: 'Connect wallet first' };
    }
    
    if (!state.isCLIAvailable) {
      return { success: false, error: state.cliStatus?.error || 'CLI not available' };
    }
    
    try {
      const bodyText = JSON.stringify({
        operation: 'apply-pending',
        wallet: publicKey.toBase58(),
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/confidential', {
        method: 'POST',
        body: bodyText,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply pending balance');
      }
      
      toast.success('✅ Pending balance applied!');
      
      return { 
        success: true, 
        signature: result.data.signature,
        message: result.data.message,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to apply pending balance';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, [publicKey, signMessage, state.isCLIAvailable, state.cliStatus]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Fetch status on mount / wallet change
  useEffect(() => {
    if (connected && publicKey) {
      fetchStatus();
    }
  }, [connected, publicKey, fetchStatus]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    ...state,
    
    // Status
    fetchStatus,
    
    // Account operations
    createAccount,
    configureAccount,
    
    // Mint & Deposit
    requestFaucetTokens,
    deposit,
    
    // Transfer
    transfer,
    
    // Withdraw
    withdraw,
    applyPendingBalance,
    
    // Convenience checks
    isReady: state.isCLIAvailable && state.isConfigured,
    canTransfer: connected && state.isCLIAvailable && state.isConfigured && !state.isTransferring,
    canDeposit: connected && state.isCLIAvailable && state.isConfigured && !state.isDepositing,
  };
}

export default useConfidentialPayment;
