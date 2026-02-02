// src/hooks/useMPCStatus.ts
// Hook for tracking MPC computation status
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { MPCStatus } from '@/types';

import { vaultPayFetch } from '@/lib/auth';

interface UseMPCStatusOptions {
  pollInterval?: number;
  autoStart?: boolean;
  onFinalized?: (txSignature: string) => void;
  onFailed?: (error: string) => void;
}

interface UseMPCStatusReturn {
  status: MPCStatus | null;
  isPolling: boolean;
  computationPda: string | null;
  mpcTxSignature: string | null;
  mpcFinalizedAt: Date | null;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  checkStatus: () => Promise<void>;
  awaitFinalization: (timeoutMs?: number) => Promise<boolean>;
}

/**
 * Hook for tracking MPC computation status for a payment
 * @param paymentId - The payment ID to track
 * @param options - Configuration options
 */
export function useMPCStatus(
  paymentId: string | null,
  options: UseMPCStatusOptions = {}
): UseMPCStatusReturn {
  const { publicKey, signMessage } = useWallet();
  const {
    pollInterval = parseInt(process.env.NEXT_PUBLIC_MPC_POLL_INTERVAL_MS || '2000'),
    autoStart = false,
    onFinalized,
    onFailed,
  } = options;

  const [status, setStatus] = useState<MPCStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [computationPda, setComputationPda] = useState<string | null>(null);
  const [mpcTxSignature, setMpcTxSignature] = useState<string | null>(null);
  const [mpcFinalizedAt, setMpcFinalizedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onFinalizedRef = useRef(onFinalized);
  const onFailedRef = useRef(onFailed);

  // Keep callbacks up to date
  useEffect(() => {
    onFinalizedRef.current = onFinalized;
    onFailedRef.current = onFailed;
  }, [onFinalized, onFailed]);

  // Check status once
  const checkStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      const response = await vaultPayFetch(
        { publicKey, signMessage },
        `/api/payments/${paymentId}/mpc-status`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch MPC status');
      }

      const data = await response.json();
      
      if (!data.mpcUsed) {
        setStatus(null);
        return;
      }

      setStatus(data.mpcStatus);
      setComputationPda(data.computationPda || null);
      setMpcTxSignature(data.mpcTxSignature || null);
      setMpcFinalizedAt(data.mpcFinalizedAt ? new Date(data.mpcFinalizedAt) : null);
      setError(null);

      // Call callbacks if status changed to terminal state
      if (data.mpcStatus === 'finalized' && data.mpcTxSignature) {
        onFinalizedRef.current?.(data.mpcTxSignature);
      } else if (data.mpcStatus === 'failed') {
        onFailedRef.current?.('MPC computation failed');
      }
    } catch (err) {
      console.error('Error checking MPC status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check status');
    }
  }, [paymentId, publicKey, signMessage]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current || !paymentId) return;
    
    setIsPolling(true);
    
    // Check immediately
    checkStatus();
    
    // Set up interval
    pollIntervalRef.current = setInterval(() => {
      // Stop polling if terminal state
      if (status === 'finalized' || status === 'failed') {
        stopPolling();
        return;
      }
      checkStatus();
    }, pollInterval);
  }, [paymentId, pollInterval, status, checkStatus, stopPolling]);

  // Await finalization (blocking)
  const awaitFinalization = useCallback(async (timeoutMs?: number): Promise<boolean> => {
    if (!paymentId) return false;

    try {
      const bodyText = JSON.stringify({
        awaitFinalization: true,
        timeoutMs: timeoutMs || parseInt(process.env.NEXT_PUBLIC_MPC_FINALIZATION_TIMEOUT_MS || '60000'),
      });

      const response = await vaultPayFetch(
        { publicKey, signMessage },
        `/api/payments/${paymentId}/mpc-status`,
        {
          method: 'POST',
          body: bodyText,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to await finalization');
      }

      const data = await response.json();
      
      setStatus(data.mpcStatus);
      setMpcTxSignature(data.mpcTxSignature || null);
      
      if (data.mpcStatus === 'finalized') {
        setMpcFinalizedAt(new Date());
        onFinalizedRef.current?.(data.mpcTxSignature);
        return true;
      } else {
        setError(data.error || 'Finalization failed');
        onFailedRef.current?.(data.error || 'Finalization failed');
        return false;
      }
    } catch (err) {
      console.error('Error awaiting finalization:', err);
      setError(err instanceof Error ? err.message : 'Failed to await finalization');
      return false;
    }
  }, [paymentId, publicKey, signMessage]);

  // Auto-start polling if enabled
  useEffect(() => {
    if (autoStart && paymentId) {
      startPolling();
    }
    return () => stopPolling();
  }, [autoStart, paymentId, startPolling, stopPolling]);

  // Stop polling when terminal state reached
  useEffect(() => {
    if (status === 'finalized' || status === 'failed') {
      stopPolling();
    }
  }, [status, stopPolling]);

  return {
    status,
    isPolling,
    computationPda,
    mpcTxSignature,
    mpcFinalizedAt,
    error,
    startPolling,
    stopPolling,
    checkStatus,
    awaitFinalization,
  };
}
