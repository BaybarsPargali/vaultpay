// src/components/org/AuditorConfig.tsx
'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { vaultPayFetch } from '@/lib/auth';
import toast from 'react-hot-toast';
import { x25519 } from '@noble/curves/ed25519';

interface AuditorConfigProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentAuditorPubkey?: string | null;
  currentAuditorName?: string | null;
  onUpdate?: () => void;
}

/**
 * Auditor Configuration Modal
 * 
 * Allows org admin to configure an auditor public key for MPC output sealing.
 * The auditor can then decrypt sealed MPC validation results.
 * 
 * Option B: Org admin configures auditor pubkey in dashboard
 */
export function AuditorConfig({
  isOpen,
  onClose,
  orgId,
  currentAuditorPubkey,
  currentAuditorName,
  onUpdate,
}: AuditorConfigProps) {
  const { publicKey, signMessage } = useWallet();
  const [auditorPubkey, setAuditorPubkey] = useState(currentAuditorPubkey || '');
  const [auditorName, setAuditorName] = useState(currentAuditorName || 'Compliance Auditor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedKeypair, setGeneratedKeypair] = useState<{
    publicKey: string;
    secretKey: string;
  } | null>(null);

  // Generate a new x25519 keypair for the auditor
  const generateKeypair = useCallback(() => {
    try {
      // Generate random 32-byte secret key
      const secretKey = crypto.getRandomValues(new Uint8Array(32));
      // Derive public key
      const publicKey = x25519.getPublicKey(secretKey);
      
      const keypair = {
        publicKey: Buffer.from(publicKey).toString('base64'),
        secretKey: Buffer.from(secretKey).toString('base64'),
      };
      
      setGeneratedKeypair(keypair);
      setAuditorPubkey(keypair.publicKey);
      setError('');
      
      toast.success('Keypair generated! Save the secret key securely.');
    } catch (err) {
      console.error('Failed to generate keypair:', err);
      setError('Failed to generate keypair');
    }
  }, []);

  // Save auditor configuration
  const handleSave = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Connect wallet first');
      return;
    }

    if (!auditorPubkey.trim()) {
      setError('Auditor public key is required');
      return;
    }

    // Validate base64 format and length
    try {
      const decoded = Buffer.from(auditorPubkey, 'base64');
      if (decoded.length !== 32) {
        setError('Public key must be 32 bytes (x25519)');
        return;
      }
    } catch {
      setError('Invalid base64 format');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await vaultPayFetch(
        { publicKey, signMessage },
        '/api/organizations',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId,
            auditorPubkey: auditorPubkey.trim(),
            auditorName: auditorName.trim() || 'Compliance Auditor',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update auditor');
      }

      toast.success('✅ Auditor configured successfully!');
      onUpdate?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, signMessage, orgId, auditorPubkey, auditorName, onUpdate, onClose]);

  // Clear auditor configuration
  const handleClear = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Connect wallet first');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await vaultPayFetch(
        { publicKey, signMessage },
        '/api/organizations',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId,
            auditorPubkey: null,
            auditorName: null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clear auditor');
      }

      setAuditorPubkey('');
      setAuditorName('Compliance Auditor');
      setGeneratedKeypair(null);
      toast.success('Auditor configuration cleared');
      onUpdate?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, signMessage, orgId, onUpdate]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Auditor" size="lg">
      <div className="space-y-6">
        {/* Explanation */}
        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <h4 className="text-purple-400 font-medium mb-2">🔐 Auditor Sealing</h4>
          <p className="text-gray-400 text-sm">
            Configure an auditor who can decrypt sealed MPC validation results.
            This enables compliance oversight without exposing payment details publicly.
          </p>
        </div>

        {/* Generate New Keypair */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Generate New Auditor Keypair</h4>
          <p className="text-gray-400 text-sm mb-3">
            Generate a new x25519 keypair for your auditor. The secret key must be saved securely
            and given to the auditor for decryption.
          </p>
          <Button
            variant="secondary"
            onClick={generateKeypair}
            disabled={isSubmitting}
          >
            🔑 Generate Keypair
          </Button>

          {generatedKeypair && (
            <div className="mt-4 space-y-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-400 text-sm font-medium">Public Key (share this)</span>
                  <button
                    onClick={() => copyToClipboard(generatedKeypair.publicKey, 'Public key')}
                    className="text-green-400 hover:text-green-300 text-xs"
                  >
                    Copy
                  </button>
                </div>
                <code className="text-white text-xs font-mono break-all">
                  {generatedKeypair.publicKey}
                </code>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-red-400 text-sm font-medium">⚠️ Secret Key (save securely!)</span>
                  <button
                    onClick={() => copyToClipboard(generatedKeypair.secretKey, 'Secret key')}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Copy
                  </button>
                </div>
                <code className="text-white text-xs font-mono break-all">
                  {generatedKeypair.secretKey}
                </code>
                <p className="text-red-400 text-xs mt-2">
                  This key will not be shown again. Save it now and share with your auditor.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Manual Entry */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Or Enter Existing Key</h4>
          
          <Input
            label="Auditor Name"
            value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
            placeholder="e.g., Compliance Officer"
          />

          <Input
            label="Auditor Public Key (base64)"
            value={auditorPubkey}
            onChange={(e) => setAuditorPubkey(e.target.value)}
            placeholder="Base64-encoded 32-byte x25519 public key"
          />
        </div>

        {/* Current Configuration */}
        {currentAuditorPubkey && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Current Auditor</h4>
            <div className="text-sm">
              <p className="text-gray-400">
                Name: <span className="text-white">{currentAuditorName || 'Unnamed'}</span>
              </p>
              <p className="text-gray-400 mt-1">
                Key: <code className="text-purple-400 text-xs">{currentAuditorPubkey.slice(0, 20)}...</code>
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSubmitting}
            disabled={!auditorPubkey.trim()}
            className="flex-1"
          >
            Save Auditor
          </Button>
          
          {currentAuditorPubkey && (
            <Button
              variant="danger"
              onClick={handleClear}
              isLoading={isSubmitting}
            >
              Clear
            </Button>
          )}
          
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AuditorConfig;
