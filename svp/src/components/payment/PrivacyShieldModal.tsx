// src/components/payment/PrivacyShieldModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';

export type PrivacyStep = 
  | 'generating-proofs'
  | 'encrypting-balance'
  | 'verifying-compliance'
  | 'complete'
  | 'error';

interface PrivacyShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: PrivacyStep;
  txSignature?: string;
  error?: string;
}

interface StepConfig {
  id: PrivacyStep;
  label: string;
  description: string;
  icon: string;
  completedIcon: string;
}

const STEPS: StepConfig[] = [
  {
    id: 'generating-proofs',
    label: 'Generating ZK Proofs',
    description: 'Creating Bulletproof range proofs client-side',
    icon: '🔐',
    completedIcon: '✅',
  },
  {
    id: 'encrypting-balance',
    label: 'Encrypting Balance',
    description: 'ElGamal encryption of amount and balance',
    icon: '🔒',
    completedIcon: '✅',
  },
  {
    id: 'verifying-compliance',
    label: 'Verifying Compliance',
    description: 'Arcium MPC co-signer + Range Protocol check',
    icon: '🛡️',
    completedIcon: '✅',
  },
];

function getStepIndex(step: PrivacyStep): number {
  const idx = STEPS.findIndex((s) => s.id === step);
  return idx === -1 ? STEPS.length : idx;
}

function ExplorerLink({ txSignature }: { txSignature: string }) {
  const explorerUrl = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
  
  return (
    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-purple-400 text-sm font-medium">Transaction Confirmed</span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
          Success
        </span>
      </div>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition group"
      >
        <span>View on Solana Explorer</span>
        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs">
        <div className="flex items-start gap-2">
          <span className="text-yellow-400 flex-shrink-0">💡</span>
          <span className="text-gray-400">
            Notice: The amount is marked as &quot;Confidential&quot; on-chain. 
            This proves the privacy actually works!
          </span>
        </div>
      </div>
    </div>
  );
}

export function PrivacyShieldModal({
  isOpen,
  onClose,
  currentStep,
  txSignature,
  error,
}: PrivacyShieldModalProps) {
  const currentIndex = getStepIndex(currentStep);
  const isComplete = currentStep === 'complete';
  const isError = currentStep === 'error';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔒 Privacy Shield Active"
      size="md"
    >
      <div className="space-y-6">
        {/* Shield Animation Header */}
        <div className="flex justify-center">
          <div className={`
            w-24 h-24 rounded-full flex items-center justify-center
            ${isComplete 
              ? 'bg-green-500/20 border-2 border-green-500/50' 
              : isError 
                ? 'bg-red-500/20 border-2 border-red-500/50'
                : 'bg-purple-500/20 border-2 border-purple-500/50 animate-pulse'}
          `}>
            <span className="text-5xl">
              {isComplete ? '✅' : isError ? '❌' : '🛡️'}
            </span>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">
            {isComplete 
              ? 'Payment Complete' 
              : isError 
                ? 'Payment Failed'
                : 'Processing Secure Payment'}
          </h3>
          <p className="text-gray-400 text-sm">
            {isComplete
              ? 'Amount is cryptographically hidden on-chain'
              : isError
                ? error || 'An error occurred during payment'
                : 'Your payment is being encrypted and verified'}
          </p>
        </div>

        {/* Steps Progress */}
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const isActive = index === currentIndex && !isComplete && !isError;
            const isCompleted = index < currentIndex || isComplete;
            const isFailed = isError && index === currentIndex;

            return (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-3 rounded-lg border transition-all duration-300
                  ${isActive 
                    ? 'bg-purple-500/10 border-purple-500/30' 
                    : isCompleted 
                      ? 'bg-green-500/5 border-green-500/20'
                      : isFailed
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-gray-700/30 border-gray-700/50'}
                `}
              >
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isActive 
                    ? 'bg-purple-500/20 animate-pulse' 
                    : isCompleted 
                      ? 'bg-green-500/20'
                      : isFailed
                        ? 'bg-red-500/20'
                        : 'bg-gray-600/50'}
                `}>
                  <span className="text-xl">
                    {isCompleted ? step.completedIcon : isFailed ? '❌' : step.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${
                      isActive 
                        ? 'text-purple-400' 
                        : isCompleted 
                          ? 'text-green-400'
                          : isFailed
                            ? 'text-red-400'
                            : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{step.description}</p>
                </div>

                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {isCompleted && (
                    <span className="text-green-400 text-sm">Done</span>
                  )}
                  {isActive && (
                    <span className="text-purple-400 text-sm">Processing...</span>
                  )}
                  {isFailed && (
                    <span className="text-red-400 text-sm">Failed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explorer Link (on success) */}
        {isComplete && txSignature && (
          <ExplorerLink txSignature={txSignature} />
        )}

        {/* Error Message */}
        {isError && error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tech Explainer */}
        {!isComplete && !isError && (
          <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
            <p className="text-gray-400 text-xs leading-relaxed">
              <span className="text-purple-400 font-medium">How it works:</span>{' '}
              VaultPay uses Token-2022 Confidential Transfers with Bulletproof ZK proofs. 
              The amount is encrypted using ElGamal encryption before leaving your device. 
              Arcium&apos;s MPC co-signer validates compliance without ever seeing the plaintext amount.
            </p>
          </div>
        )}

        {/* Close Button (only when complete or error) */}
        {(isComplete || isError) && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition"
          >
            {isComplete ? 'Done' : 'Close'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// Hook for managing privacy shield state
export function usePrivacyShield() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<PrivacyStep>('generating-proofs');
  const [txSignature, setTxSignature] = useState<string>();
  const [error, setError] = useState<string>();

  const start = useCallback(() => {
    setIsOpen(true);
    setCurrentStep('generating-proofs');
    setTxSignature(undefined);
    setError(undefined);
  }, []);

  const advance = useCallback((step: PrivacyStep) => {
    setCurrentStep(step);
  }, []);

  const complete = useCallback((signature: string) => {
    setTxSignature(signature);
    setCurrentStep('complete');
  }, []);

  const fail = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setCurrentStep('error');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Reset state after animation completes
    setTimeout(() => {
      setCurrentStep('generating-proofs');
      setTxSignature(undefined);
      setError(undefined);
    }, 300);
  }, []);

  return {
    isOpen,
    currentStep,
    txSignature,
    error,
    start,
    advance,
    complete,
    fail,
    close,
    // Convenience methods for each step
    startGeneratingProofs: () => { start(); advance('generating-proofs'); },
    startEncrypting: () => advance('encrypting-balance'),
    startVerifyingCompliance: () => advance('verifying-compliance'),
  };
}
