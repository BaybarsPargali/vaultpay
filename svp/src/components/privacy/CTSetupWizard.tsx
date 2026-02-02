// src/components/privacy/CTSetupWizard.tsx
// Confidential Transfer Setup Wizard - Uses CLI Bridge (REAL ZK proofs)
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useConfidentialPayment } from '@/hooks/useConfidentialPayment';

interface CTSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type WizardStep = 'intro' | 'cli-check' | 'configure-account' | 'deposit' | 'complete';

export function CTSetupWizard({ isOpen, onClose, onComplete }: CTSetupWizardProps) {
  const { publicKey } = useWallet();
  const {
    isCLIAvailable,
    cliStatus,
    isConfigured,
    configureAccount,
    requestFaucetTokens,
    deposit,
    fetchStatus,
    isConfiguring,
    isDepositing,
    hasMintAuthority,
  } = useConfidentialPayment();
  
  const [step, setStep] = useState<WizardStep>('intro');
  const [error, setError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [hasDeposited, setHasDeposited] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setError(null);
      setHasMinted(false);
      setHasDeposited(false);
    }
  }, [isOpen]);

  const handleConfigureAccount = useCallback(async () => {
    setError(null);
    try {
      const result = await configureAccount();
      if (result.success) {
        setStep('deposit');
      } else {
        setError(result.error || 'Failed to configure account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure account');
    }
  }, [configureAccount]);

  const handleMintFaucet = useCallback(async () => {
    setError(null);
    setIsMinting(true);
    try {
      const result = await requestFaucetTokens(100);
      if (result.success) {
        setHasMinted(true);
      } else {
        setError(result.error || 'Failed to request tokens');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request tokens');
    } finally {
      setIsMinting(false);
    }
  }, [requestFaucetTokens]);

  const handleDeposit = useCallback(async () => {
    setError(null);
    try {
      const result = await deposit(100); // Deposit 100 VPAY
      if (result.success) {
        setHasDeposited(true);
        setStep('complete');
      } else {
        setError(result.error || 'Failed to deposit');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deposit');
    }
  }, [deposit]);

  const handleComplete = useCallback(() => {
    fetchStatus();
    onComplete?.();
    onClose();
  }, [fetchStatus, onComplete, onClose]);

  const handleClose = () => {
    setStep('intro');
    setError(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-white mb-2">Enable Full Privacy</h2>
              <p className="text-gray-400">
                Set up Token-2022 Confidential Transfers to make your payment amounts 
                truly private on-chain.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-medium">What you&apos;ll get:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Transfer amounts encrypted with Twisted ElGamal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>REAL Zero-knowledge proofs via spl-token CLI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Only you and recipient can see amounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Solscan shows encrypted ciphertexts only</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <h4 className="text-blue-400 font-medium text-sm mb-2">⚡ CLI-Powered</h4>
              <p className="text-gray-400 text-xs">
                VaultPay uses the official spl-token CLI for ZK proof generation.
                This ensures real on-chain privacy - no simulations!
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setStep('cli-check')}
            >
              Get Started
            </Button>
          </div>
        );

      case 'cli-check':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">{isCLIAvailable ? '✅' : '⚙️'}</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isCLIAvailable ? 'Privacy Engine Ready!' : 'Server Configuration Needed'}
              </h2>
              <p className="text-gray-400">
                {isCLIAvailable 
                  ? 'Real ZK proof generation is enabled via the official spl-token CLI.'
                  : 'Token-2022 CT requires server-side ZK proof generation.'}
              </p>
            </div>

            {isCLIAvailable ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span>✓</span>
                  <span>spl-token CLI installed (official Solana tooling)</span>
                </div>
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span>✓</span>
                  <span>Real Bulletproof ZK proofs enabled</span>
                </div>
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span>✓</span>
                  <span>Production-grade cryptography ready</span>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">ℹ️</span>
                  <p className="text-gray-300 text-sm">
                    <strong className="text-yellow-400">Why CLI?</strong> Solana&apos;s Token-2022 CT uses Bulletproof ZK proofs that are only available in Rust. The CLI is the official production approach - there is no JavaScript SDK for this cryptography.
                  </p>
                </div>
                <p className="text-yellow-400 text-sm">{cliStatus?.error}</p>
                {cliStatus?.requirements && (
                  <div className="bg-black/30 rounded-lg p-3 space-y-2">
                    <p className="text-gray-400 text-xs">Server requirements:</p>
                    <code className="block text-gray-300 text-xs font-mono">
                      {cliStatus.requirements.cli}
                    </code>
                    <code className="block text-gray-300 text-xs font-mono">
                      {cliStatus.requirements.env}
                    </code>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('intro')}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setStep('configure-account')}
                disabled={!isCLIAvailable}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'configure-account':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Configure Account</h2>
              <p className="text-gray-400">
                Enable your token account to receive confidential transfers.
                The CLI will generate your ElGamal keypair automatically.
              </p>
            </div>

            {isConfigured ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span>✓</span>
                  <span>Account already configured!</span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h4 className="text-white font-medium text-sm mb-2">This will:</h4>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• Create your VaultPay token account (if needed)</li>
                  <li>• Generate ElGamal encryption keypair via CLI</li>
                  <li>• Register keypair on-chain with ZK validity proof</li>
                  <li>• Enable confidential credit reception</li>
                </ul>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('cli-check')}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={isConfigured ? () => setStep('deposit') : handleConfigureAccount}
                isLoading={isConfiguring}
              >
                {isConfigured ? 'Continue' : 'Configure Account'}
              </Button>
            </div>
          </div>
        );

      case 'deposit':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">💎</div>
              <h2 className="text-2xl font-bold text-white mb-2">Deposit Tokens</h2>
              <p className="text-gray-400">
                Get VPAY tokens and deposit them to your confidential balance.
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span>✓</span>
                <span>Account configured for confidential transfers!</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
              {/* Step 1: Mint from faucet */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${hasMinted ? 'bg-green-500/10 border border-green-500/20' : 'bg-purple-500/5 border border-purple-500/20'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${hasMinted ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'}`}>
                  {hasMinted ? '✓' : '1'}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">Request VPAY Tokens</h4>
                  <p className="text-gray-400 text-xs">
                    {hasMintAuthority ? 'Get 100 VPAY from the devnet faucet' : 'Faucet not available - mint authority required'}
                  </p>
                </div>
                <Button
                  variant={hasMinted ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleMintFaucet}
                  isLoading={isMinting}
                  disabled={hasMinted || !hasMintAuthority}
                >
                  {hasMinted ? 'Done' : 'Request'}
                </Button>
              </div>

              {/* Step 2: Deposit to confidential */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${hasDeposited ? 'bg-green-500/10 border border-green-500/20' : hasMinted ? 'bg-purple-500/5 border border-purple-500/20' : 'bg-gray-700/30 border border-gray-600/20'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${hasDeposited ? 'bg-green-500 text-white' : hasMinted ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                  {hasDeposited ? '✓' : '2'}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium text-sm ${hasMinted ? 'text-white' : 'text-gray-500'}`}>Deposit to Confidential</h4>
                  <p className={`text-xs ${hasMinted ? 'text-gray-400' : 'text-gray-600'}`}>Encrypt your balance on-chain</p>
                </div>
                <Button
                  variant={hasDeposited ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleDeposit}
                  isLoading={isDepositing}
                  disabled={!hasMinted || hasDeposited}
                >
                  {hasDeposited ? 'Done' : 'Deposit'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('configure-account')}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setStep('complete')}
                disabled={!hasDeposited}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">You&apos;re All Set!</h2>
              <p className="text-gray-400">
                Your account is now configured for fully private payments.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-500/20 to-green-500/20 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🔒</div>
                <div>
                  <h3 className="text-white font-semibold">Full Privacy Enabled</h3>
                  <p className="text-gray-400 text-sm">
                    Your payment amounts are now encrypted on-chain
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-green-400">
                <span>✓</span> Twisted ElGamal encryption active
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span>✓</span> REAL ZK proofs via spl-token CLI
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span>✓</span> Confidential transfers ready
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span>✓</span> Amount hidden from block explorers
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleComplete}
            >
              Go to Dashboard
            </Button>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="md"
    >
      {renderStepContent()}
    </Modal>
  );
}
