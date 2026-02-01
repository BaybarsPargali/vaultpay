// src/hooks/usePrivatePayment.ts
// ============================================================================
// PRIVATE PAYMENT HOOK
// ============================================================================
//
// React hook for executing truly private payments.
// Uses Token-2022 Confidential Transfers with compliance checking.
//
// PRIVACY GUARANTEE:
// - Amount NEVER visible on-chain (encrypted via ElGamal)
// - ZK proofs verify validity without revealing data
// - Compliance checks recipient address only
//
// ============================================================================

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentRequest {
  recipientWallet: string;
  amount: number;
  organizationId: string;
  paymentId?: string;
}

interface ComplianceResult {
  approved: boolean;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason?: string;
}

interface PaymentResult {
  success: boolean;
  txSignature?: string;
  compliance: ComplianceResult;
  error?: string;
}

interface ServiceStatus {
  available: boolean;
  cli: boolean;
  mint: string | null;
  network: string;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePrivatePayment() {
  const { publicKey, signMessage } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if private payment service is available
   */
  const checkAvailability = useCallback(async (): Promise<ServiceStatus | null> => {
    try {
      const response = await fetch('/api/payments/private');
      const data = await response.json();
      return {
        available: data.available,
        cli: data.cliAvailable,
        mint: data.mint,
        network: data.network || 'devnet',
      };
    } catch (err) {
      console.error('Failed to check service availability:', err);
      return null;
    }
  }, []);

  /**
   * Execute a private payment
   * 
   * @param request - Payment details
   * @returns Payment result with transaction signature
   * 
   * @example
   * ```tsx
   * const { executePayment } = usePrivatePayment();
   * 
   * const result = await executePayment({
   *   recipientWallet: 'recipient_address',
   *   amount: 100,
   *   organizationId: 'org_id',
   * });
   * 
   * if (result.success) {
   *   console.log('Payment sent:', result.txSignature);
   *   // Amount is encrypted on-chain!
   * }
   * ```
   */
  const executePayment = useCallback(
    async (request: PaymentRequest): Promise<PaymentResult> => {
      if (!publicKey || !signMessage) {
        const err = 'Wallet not connected';
        setError(err);
        toast.error(err);
        return {
          success: false,
          error: err,
          compliance: { approved: false },
        };
      }

      setIsProcessing(true);
      setError(null);

      try {
        // 1. Create auth message
        const timestamp = Date.now();
        const message = `VaultPay Private Payment\n` +
          `Timestamp: ${timestamp}\n` +
          `Amount: ${request.amount}\n` +
          `To: ${request.recipientWallet}`;

        // 2. Sign with wallet - show "signing" toast
        toast.loading('Signing for Co-Signer approval...', { id: 'payment-signing' });
        const messageBytes = new TextEncoder().encode(message);
        const signature = await signMessage(messageBytes);
        const signatureBase64 = Buffer.from(signature).toString('base64');
        toast.dismiss('payment-signing');

        // 3. Call private payment API
        toast.loading('Processing compliant transfer...', { id: 'payment-processing' });
        const response = await fetch('/api/payments/private', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Wallet-Address': publicKey.toBase58(),
            'X-Wallet-Signature': signatureBase64,
            'X-Signature-Message': message,
          },
          body: JSON.stringify(request),
        });

        const data = await response.json();
        toast.dismiss('payment-processing');

        if (data.success) {
          const result: PaymentResult = {
            success: true,
            txSignature: data.txSignature,
            compliance: data.compliance,
          };
          setLastResult(result);
          toast.success('Private payment sent! Amount is encrypted on-chain.');
          return result;
        } else {
          const result: PaymentResult = {
            success: false,
            error: data.error,
            compliance: data.compliance || { approved: false },
          };
          setLastResult(result);
          
          // Different toast for compliance vs technical errors
          if (!data.compliance?.approved) {
            toast.error(`Payment blocked: ${data.compliance?.reason || 'Compliance failed'}`);
          } else {
            toast.error(`Payment failed: ${data.error || 'Unknown error'}`);
          }
          
          return result;
        }
      } catch (err) {
        toast.dismiss('payment-signing');
        toast.dismiss('payment-processing');
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        toast.error(`Payment failed: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
          compliance: { approved: false },
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [publicKey, signMessage]
  );

  /**
   * Reset error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isProcessing,
    lastResult,
    error,
    isReady: !!publicKey && !!signMessage,

    // Actions
    executePayment,
    checkAvailability,
    clearError,
  };
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

export type { PaymentRequest, PaymentResult, ComplianceResult, ServiceStatus };
