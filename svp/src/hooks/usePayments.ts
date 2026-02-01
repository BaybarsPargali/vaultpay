// src/hooks/usePayments.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import toast from 'react-hot-toast';
import type { Payment, CreatePaymentInput } from '@/types';
import { vaultPayProgram } from '@/lib/arcium/program';
import { vaultPayFetch } from '@/lib/auth';

interface UsePaymentsReturn {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  createPayment: (data: Omit<CreatePaymentInput, 'orgId'>) => Promise<Payment>;
  executePayment: (paymentId: string) => Promise<Payment>;
  cancelPayment: (paymentId: string) => Promise<void>;
  createBatchPayments: (payments: { payeeId: string; amount: number }[]) => Promise<Payment[]>;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function usePayments(orgId: string | null): UsePaymentsReturn {
  const { publicKey, signMessage, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Fetch payments for organization
  const fetchPayments = useCallback(
    async (reset = false) => {
      if (!orgId) {
        setPayments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;

      try {
        const path = `/api/payments?orgId=${orgId}&limit=${limit}&offset=${currentOffset}`;
        const response = await vaultPayFetch({ publicKey, signMessage }, path);

        if (!response.ok) {
          throw new Error('Failed to fetch payments');
        }

        const data = await response.json();

        if (reset) {
          setPayments(data.payments);
          setOffset(data.payments.length);
        } else {
          setPayments((prev) => [...prev, ...data.payments]);
          setOffset((prev) => prev + data.payments.length);
        }

        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      } finally {
        setIsLoading(false);
      }
    },
    [orgId, offset, publicKey, signMessage]
  );

  // Create a new payment
  const createPayment = useCallback(
    async (data: Omit<CreatePaymentInput, 'orgId'>): Promise<Payment> => {
      if (!orgId) {
        throw new Error('No organization selected');
      }

      try {
        const bodyText = JSON.stringify({
          ...data,
          orgId,
        });

        const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments', {
          method: 'POST',
          body: bodyText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment');
        }

        const { payment } = await response.json();
        setPayments((prev) => [payment, ...prev]);
        setTotal((prev) => prev + 1);
        toast.success('Payment created!');
        return payment;
      } catch (err) {
        console.error('Error creating payment:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to create payment');
        throw err;
      }
    },
    [orgId, publicKey, signMessage]
  );

  // Execute a CONFIDENTIAL payment - amount is encrypted on-chain
  // On-chain observers see ONLY encrypted ciphertext, NOT the actual amount
  const executePayment = useCallback(
    async (paymentId: string): Promise<Payment> => {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      const loadingToast = toast.loading('Creating confidential transfer...');

      try {
        // Step 1: Get payment details
        const paymentRes = await vaultPayFetch(
          { publicKey, signMessage },
          `/api/payments/${paymentId}`
        );
        if (!paymentRes.ok) {
          throw new Error('Payment not found');
        }
        const { payment: paymentDetails } = await paymentRes.json();

        // Step 2: Get sender balance for encryption
        const balance = await connection.getBalance(publicKey);
        const balanceSol = balance / LAMPORTS_PER_SOL;

        // Step 3: Create confidential transfer transaction
        // The amount is encrypted - on-chain shows ONLY ciphertext
        const recipientPubkey = new PublicKey(paymentDetails.payee.walletAddress);
        
        const { transaction, encryptedData, computationOffset } = 
          await vaultPayProgram.createConfidentialTransfer(
            publicKey,
            recipientPubkey,
            paymentDetails.amount,
            balanceSol
          );

        // Step 4: Send the confidential transfer transaction
        toast.dismiss(loadingToast);
        const signingToast = toast.loading('Sign confidential transfer...');

        const signature = await sendTransaction(transaction, connection);

        toast.dismiss(signingToast);
        const confirmToast = toast.loading('Confirming on-chain...');

        // Wait for confirmation
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });

        toast.dismiss(confirmToast);

        // Step 5: Update database with encrypted data
        const encryptionStorage = vaultPayProgram.getEncryptionDataForStorage(encryptedData);
        const bodyText = JSON.stringify({
          paymentId,
          senderPublicKey: publicKey.toBase58(),
          txSignature: signature,
          confidential: true, // Flag for confidential transfer
          encryptedData: encryptionStorage,
          computationOffset: computationOffset.toString(),
        });

        const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/execute', {
          method: 'POST',
          body: bodyText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Payment execution failed');
        }

        const { payment } = await response.json();
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? payment : p))
        );

        toast.success(`🔐 Confidential payment sent! Tx: ${signature.slice(0, 8)}...`);
        return payment;
      } catch (err) {
        console.error('Error executing confidential payment:', err);
        toast.dismiss(loadingToast);
        
        // PRIVACY FIRST: Never fall back to regular transfers!
        // If confidential transfer fails, the payment must fail to protect privacy
        const errorMsg = err instanceof Error ? err.message : 'Payment failed';
        
        if (errorMsg.includes('custom program error') || errorMsg.includes('Account') || errorMsg.includes('Unexpected error')) {
          // Arcium cluster not available - DO NOT fall back to regular transfer
          console.error('[VaultPay] ❌ Arcium MPC cluster unavailable. Payment cancelled to protect privacy.');
          toast.error(
            '🔒 Privacy cluster offline. Payment cancelled to protect your privacy. Please try again later.',
            { duration: 6000 }
          );
          
          // Update payment status to failed
          try {
            const bodyText = JSON.stringify({
              status: 'failed',
              errorMessage: 'Arcium MPC cluster unavailable - payment cancelled to protect privacy',
            });

            await vaultPayFetch(
              { publicKey, signMessage },
              `/api/payments/${paymentId}`,
              {
                method: 'PATCH',
                body: bodyText,
              }
            );
          } catch {
            // Ignore update error
          }
        } else {
          toast.error(errorMsg);
        }
        throw err;
      }
    },
    [publicKey, signMessage, sendTransaction, connection]
  );

  // Cancel a pending payment
  const cancelPayment = useCallback(async (paymentId: string): Promise<void> => {
    try {
      const response = await vaultPayFetch({ publicKey, signMessage }, `/api/payments/${paymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel payment');
      }

      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setTotal((prev) => prev - 1);
      toast.success('Payment cancelled!');
    } catch (err) {
      console.error('Error cancelling payment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel payment');
      throw err;
    }
  }, [publicKey, signMessage]);

  // Create batch payments
  const createBatchPayments = useCallback(
    async (paymentData: { payeeId: string; amount: number }[]): Promise<Payment[]> => {
      if (!orgId) {
        throw new Error('No organization selected');
      }

      try {
        const bodyText = JSON.stringify({
          orgId,
          payments: paymentData,
        });

        const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payments/batch', {
          method: 'POST',
          body: bodyText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create batch payments');
        }

        const { payments: newPayments, totalAmount } = await response.json();
        setPayments((prev) => [...newPayments, ...prev]);
        setTotal((prev) => prev + newPayments.length);
        toast.success(`Batch payroll created! Total: ${totalAmount} SOL`);
        return newPayments;
      } catch (err) {
        console.error('Error creating batch payments:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to create batch');
        throw err;
      }
    },
    [orgId, publicKey, signMessage]
  );

  // Load more payments
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchPayments(false);
  }, [hasMore, isLoading, fetchPayments]);

  // Initial fetch when orgId changes
  useEffect(() => {
    if (orgId) {
      fetchPayments(true);
    }
    // We only want to refetch when orgId changes, not when fetchPayments updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return {
    payments,
    isLoading,
    error,
    total,
    hasMore,
    createPayment,
    executePayment,
    cancelPayment,
    createBatchPayments,
    refetch: () => fetchPayments(true),
    loadMore,
  };
}
