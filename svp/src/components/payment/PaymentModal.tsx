// src/components/payment/PaymentModal.tsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ComplianceBadge } from '@/components/payee/ComplianceBadge';
import { PrivacyShieldModal, usePrivacyShield } from './PrivacyShieldModal';
import type { Payee } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payee: Payee | null;
  onPay: (payeeId: string, amount: number) => Promise<{ txSignature?: string }>;
  balance?: number | null; // Wallet balance for validation
}

export function PaymentModal({ isOpen, onClose, payee, onPay, balance }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitLockRef = useRef(false); // Prevents double-clicks
  const privacyShield = usePrivacyShield();

  // Calculate total with fee
  const { fee, total, hasInsufficientBalance } = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    const calculatedFee = amountNum * 0.001;
    const calculatedTotal = amountNum + calculatedFee;
    const insufficient = balance !== null && balance !== undefined && calculatedTotal > balance;
    return { fee: calculatedFee, total: calculatedTotal, hasInsufficientBalance: insufficient };
  }, [amount, balance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-clicks with ref lock
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      submitLockRef.current = false;
      return;
    }

    if (hasInsufficientBalance) {
      setError(`Insufficient balance. You need ${total.toFixed(4)} SOL but have ${balance?.toFixed(4)} SOL`);
      submitLockRef.current = false;
      return;
    }

    if (!payee) {
      submitLockRef.current = false;
      return;
    }

    setIsSubmitting(true);
    privacyShield.start();
    
    try {
      // Step 1: Generating ZK Proofs
      privacyShield.advance('generating-proofs');
      await new Promise(resolve => setTimeout(resolve, 800)); // Visual feedback
      
      // Step 2: Encrypting Balance
      privacyShield.advance('encrypting-balance');
      await new Promise(resolve => setTimeout(resolve, 600)); // Visual feedback
      
      // Step 3: Verifying Compliance (actual payment happens here)
      privacyShield.advance('verifying-compliance');
      const result = await onPay(payee.id, amountNum);
      
      // Complete with transaction signature
      privacyShield.complete(result.txSignature || 'simulated-tx');
      
      // Don't close immediately - let user see the success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      privacyShield.fail(errorMessage);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing during payment
    setAmount('');
    setError('');
    privacyShield.close();
    onClose();
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount.toString());
    setError('');
  };

  const handleMaxAmount = () => {
    if (balance && balance > 0) {
      // Account for fee: amount + amount*0.001 = balance => amount = balance / 1.001
      const maxAmount = Math.floor((balance / 1.001) * 10000) / 10000;
      setAmount(maxAmount.toString());
      setError('');
    }
  };

  if (!payee) return null;

  // Truncate wallet address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
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
          {/* Preset Amount Buttons */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-400 text-xs">Quick:</span>
            {[0.1, 0.5, 1, 5].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetAmount(preset)}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white rounded transition"
              >
                {preset} SOL
              </button>
            ))}
            {balance && balance > 0 && (
              <button
                type="button"
                onClick={handleMaxAmount}
                className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded border border-purple-500/30 transition"
              >
                Max
              </button>
            )}
          </div>

          <Input
            label="Amount (SOL)"
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
          {balance !== null && balance !== undefined && (
            <div className={`flex items-center justify-between mt-2 text-sm ${hasInsufficientBalance ? 'text-red-400' : 'text-gray-400'}`}>
              <span>Your balance</span>
              <span className="font-medium">{balance.toFixed(4)} SOL</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-400">Fee (0.1%)</span>
            <span className="text-gray-300">
              {fee.toFixed(4)} SOL
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-sm">
            <span className="text-gray-400">Total</span>
            <span className={`font-medium ${hasInsufficientBalance ? 'text-red-400' : 'text-white'}`}>
              {total.toFixed(4)} SOL
            </span>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                Insufficient balance. Need {(total - (balance || 0)).toFixed(4)} more SOL.
              </p>
            </div>
          )}
        </div>

        {/* Privacy Notice - accurate description of privacy model */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <h4 className="text-purple-400 font-medium text-sm mb-1">
                Arcium MPC Encrypted Processing
              </h4>
              <p className="text-gray-400 text-xs mb-2">
                Amount encrypted with ElGamal + Bulletproof ZK proofs. Compliance via Arcium MPC co-signer.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ ZK Encrypted Amount</span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ Co-Signed Compliance</span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">✓ Token-2022 CT</span>
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isSubmitting}
            disabled={isSubmitting || hasInsufficientBalance}
          >
            🔒 Pay Privately
          </Button>
        </div>
      </form>

      {/* Privacy Shield Animation Modal */}
      <PrivacyShieldModal
        isOpen={privacyShield.isOpen}
        onClose={() => {
          privacyShield.close();
          if (privacyShield.currentStep === 'complete') {
            handleClose();
          }
        }}
        currentStep={privacyShield.currentStep}
        txSignature={privacyShield.txSignature}
        error={privacyShield.error}
      />
    </Modal>
  );
}
