// src/components/privacy/PrivatePaymentModal.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ComplianceBadge } from '@/components/payee/ComplianceBadge';
import { PrivacyStatusBadge } from './PrivacyStatusBadge';
import { useConfidentialPayment } from '@/hooks/useConfidentialPayment';
import type { Payee } from '@/types';

type PaymentMode = 'private' | 'standard';

interface PrivatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payee: Payee | null;
  onPayStandard: (payeeId: string, amount: number) => Promise<void>;
  balance?: number | null;
  onSetupPrivacy?: () => void;
}

export function PrivatePaymentModal({
  isOpen,
  onClose,
  payee,
  onPayStandard,
  balance,
  onSetupPrivacy,
}: PrivatePaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('private');

  const {
    isReady: ctReady,
    isCLIAvailable,
    isConfigured,
    transfer: ctTransfer,
    isTransferring,
  } = useConfidentialPayment();

  // Calculate fees based on payment mode
  const { fee, total, hasInsufficientBalance } = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    
    if (paymentMode === 'private') {
      // CT payments have minimal fees (estimated - actual fees may vary)
      const calculatedFee = amountNum * 0.0005; // ~0.05% estimated
      const calculatedTotal = amountNum + calculatedFee;
      // CT balance is managed server-side via CLI - we don't have direct access
      // Just allow the transfer to proceed and let the server validate
      return { fee: calculatedFee, total: calculatedTotal, hasInsufficientBalance: false };
    } else {
      // Standard SOL payments - network fees only
      const calculatedFee = 0.000005; // ~5000 lamports base fee
      const calculatedTotal = amountNum + calculatedFee;
      const insufficient = balance !== null && balance !== undefined && calculatedTotal > balance;
      return { fee: calculatedFee, total: calculatedTotal, hasInsufficientBalance: insufficient };
    }
  }, [amount, paymentMode, balance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (hasInsufficientBalance) {
      if (paymentMode === 'private') {
        setError('Insufficient private balance. Please deposit more tokens first.');
      } else {
        setError(`Insufficient balance. You need ${total.toFixed(4)} SOL but have ${balance?.toFixed(4)} SOL`);
      }
      return;
    }

    if (!payee) return;

    setIsSubmitting(true);
    try {
      if (paymentMode === 'private') {
        // Execute confidential transfer via CLI Bridge
        const result = await ctTransfer(payee.walletAddress, parseFloat(amount));
        if (!result.success) {
          throw new Error(result.error || 'Private transfer failed');
        }
      } else {
        // Execute standard SOL transfer
        await onPayStandard(payee.id, amountNum);
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    onClose();
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount.toString());
    setError('');
  };

  const handleMaxAmount = useCallback(() => {
    // For private mode, we don't have balance access - user must enter amount manually
    if (paymentMode === 'standard' && balance && balance > 0) {
      const maxAmount = Math.floor((balance / 1.001) * 10000) / 10000;
      setAmount(maxAmount.toString());
    }
    setError('');
  }, [paymentMode, balance]);

  if (!payee) return null;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const canUsePrivate = ctReady && isCLIAvailable && isConfigured;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Mode Selector */}
        <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
          <button
            type="button"
            onClick={() => setPaymentMode('private')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition ${
              paymentMode === 'private'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            disabled={!canUsePrivate}
          >
            🔒 Private
            {!canUsePrivate && <span className="text-xs text-gray-500">(Setup Required)</span>}
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('standard')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition ${
              paymentMode === 'standard'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔓 Standard
          </button>
        </div>

        {/* Privacy Setup Prompt */}
        {!canUsePrivate && paymentMode === 'standard' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium">Privacy Not Enabled</p>
                <p className="text-gray-400 text-xs mt-1">
                  Standard payments are visible on Solscan. Enable privacy for encrypted transfers.
                </p>
                {onSetupPrivacy && (
                  <button
                    type="button"
                    onClick={onSetupPrivacy}
                    className="mt-2 text-purple-400 hover:text-purple-300 text-xs font-medium"
                  >
                    Enable Full Privacy →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recipient Info */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">{payee.name}</h3>
              <p className="text-gray-400 text-sm">{payee.email}</p>
              <code className="text-gray-500 text-xs">
                {truncateAddress(payee.walletAddress)}
              </code>
            </div>
            <ComplianceBadge
              status={payee.rangeStatus}
              riskScore={payee.rangeRiskScore}
              size="sm"
            />
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-400 text-xs">Quick:</span>
            {(paymentMode === 'private' ? [10, 50, 100, 500] : [0.1, 0.5, 1, 5]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetAmount(preset)}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white rounded transition"
              >
                {preset} {paymentMode === 'private' ? 'VPAY' : 'SOL'}
              </button>
            ))}
            <button
              type="button"
              onClick={handleMaxAmount}
              className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded border border-purple-500/30 transition"
            >
              Max
            </button>
          </div>

          <Input
            label={`Amount (${paymentMode === 'private' ? 'VPAY' : 'SOL'})`}
            type="number"
            step="0.0001"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            placeholder="0.00"
            error={error}
            autoFocus
          />

          {/* Balance Display */}
          <div className={`flex items-center justify-between mt-2 text-sm ${hasInsufficientBalance ? 'text-red-400' : 'text-gray-400'}`}>
            <span>Your {paymentMode === 'private' ? 'private' : ''} balance</span>
            <span className="font-medium">
              {paymentMode === 'private'
                ? '(encrypted)'
                : `${balance?.toFixed(4) || '0'} SOL`
              }
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-400">Fee ({paymentMode === 'private' ? '0.05%' : '0.1%'})</span>
            <span className="text-gray-300">
              {fee.toFixed(4)} {paymentMode === 'private' ? 'VPAY' : 'SOL'}
            </span>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                Insufficient balance for this transfer.
              </p>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className={`${
          paymentMode === 'private' 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-yellow-500/10 border-yellow-500/20'
        } border rounded-lg p-4`}>
          <div className="flex items-start gap-3">
            <PrivacyStatusBadge 
              level={paymentMode === 'private' ? 'full' : 'partial'} 
              size="sm" 
            />
            <div className="flex-1">
              <h4 className={`${
                paymentMode === 'private' ? 'text-green-400' : 'text-yellow-400'
              } font-medium text-sm mb-1`}>
                {paymentMode === 'private' ? 'Fully Private Transfer' : 'Standard Transfer'}
              </h4>
              <p className="text-gray-400 text-xs">
                {paymentMode === 'private'
                  ? 'Amount encrypted with Twisted ElGamal. Only you and recipient can see the value.'
                  : 'Transfer amount visible on Solscan. Data encrypted via Arcium MPC.'
                }
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {paymentMode === 'private' ? (
                  <>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ Encrypted amount</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ ZK proofs</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ Hidden on Solscan</span>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ MPC validated</span>
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">⚠ Amount visible</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isSubmitting || isTransferring}
            disabled={paymentMode === 'private' && !canUsePrivate}
          >
            {paymentMode === 'private' ? '🔒 Pay Privately' : '💸 Pay'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
