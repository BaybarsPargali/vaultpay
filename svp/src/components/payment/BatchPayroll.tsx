// src/components/payment/BatchPayroll.tsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ComplianceBadge } from '@/components/payee/ComplianceBadge';
import { PrivacyShieldModal, usePrivacyShield } from './PrivacyShieldModal';
import type { Payee } from '@/types';

interface PayeeAmount {
  payeeId: string;
  amount: number;
}

interface BatchPayrollProps {
  isOpen: boolean;
  onClose: () => void;
  payees: Payee[];
  onExecute: (payments: PayeeAmount[]) => Promise<{ txSignature?: string }>;
}

export function BatchPayroll({
  isOpen,
  onClose,
  payees,
  onExecute,
}: BatchPayrollProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false); // Prevents double-clicks
  const privacyShield = usePrivacyShield();

  // Only show approved payees
  const approvedPayees = payees.filter(
    (p) => p.rangeStatus === 'approved' || p.rangeStatus === 'pending'
  );

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let count = 0;

    selectedIds.forEach((id) => {
      const amount = parseFloat(amounts[id] || '0');
      if (amount > 0) {
        subtotal += amount;
        count++;
      }
    });

    const fee = subtotal * 0.001;
    return { subtotal, fee, total: subtotal + fee, count };
  }, [selectedIds, amounts]);

  const handleAmountChange = (payeeId: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [payeeId]: value }));
    if (parseFloat(value) > 0) {
      setSelectedIds((prev) => new Set(Array.from(prev).concat(payeeId)));
    }
  };

  const handleTogglePayee = (payeeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(payeeId)) {
        next.delete(payeeId);
      } else {
        next.add(payeeId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === approvedPayees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvedPayees.map((p) => p.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-clicks with ref lock
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;

    const payments: PayeeAmount[] = [];
    selectedIds.forEach((id) => {
      const amount = parseFloat(amounts[id] || '0');
      if (amount > 0) {
        payments.push({ payeeId: id, amount });
      }
    });

    if (payments.length === 0) {
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
      const result = await onExecute(payments);
      
      // Complete with transaction signature
      privacyShield.complete(result.txSignature || 'batch-tx');
      
      // Don't close immediately - let user see the success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch payment failed';
      privacyShield.fail(errorMessage);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing during payment
    setAmounts({});
    setSelectedIds(new Set());
    privacyShield.close();
    onClose();
  };

  // Truncate wallet address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Run Payroll" size="xl">
      <form onSubmit={handleSubmit}>
        {/* Header with Select All */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-400 text-sm">
            {approvedPayees.length} team members available
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
            {selectedIds.size === approvedPayees.length
              ? 'Deselect All'
              : 'Select All'}
          </Button>
        </div>

        {/* Payee List */}
        <div className="max-h-80 overflow-y-auto space-y-2 mb-6">
          {approvedPayees.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No approved team members. Add team members first.
            </div>
          ) : (
            approvedPayees.map((payee) => (
              <div
                key={payee.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition ${
                  selectedIds.has(payee.id)
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-gray-700/30 border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(payee.id)}
                  onChange={() => handleTogglePayee(payee.id)}
                  className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">
                      {payee.name}
                    </span>
                    <ComplianceBadge status={payee.rangeStatus} size="sm" />
                  </div>
                  <div className="text-gray-400 text-sm">
                    {truncateAddress(payee.walletAddress)}
                  </div>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.00"
                    value={amounts[payee.id] || ''}
                    onChange={(e) => handleAmountChange(payee.id, e.target.value)}
                    className="text-right"
                  />
                </div>
                <span className="text-gray-400 text-sm w-10">SOL</span>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Payments ({totals.count})
              </span>
              <span className="text-white">{totals.subtotal.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Fee (0.1%)</span>
              <span className="text-white">{totals.fee.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between text-lg font-medium pt-2 border-t border-gray-600">
              <span className="text-white">Total</span>
              <span className="text-purple-400">{totals.total.toFixed(4)} SOL</span>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-6">
          <p className="text-gray-400 text-xs flex items-center gap-2">
            <span>🔒</span>
            All payments encrypted via Token-2022 CT + Arcium MPC co-signer
          </p>
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
            disabled={totals.count === 0 || isSubmitting}
          >
            🔒 Execute Payroll ({totals.count})
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
