// src/components/org/CreateOrgModal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CreateOrgModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  allowSkip?: boolean;
}

export function CreateOrgModal({ onClose, onCreate, allowSkip = true }: CreateOrgModalProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const validateName = (value: string): string | null => {
    if (!value.trim()) return 'Organization name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    if (value.trim().length > 50) return 'Name must be less than 50 characters';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError('');
    try {
      await onCreate(name.trim());
    } catch (err) {
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    // Store in localStorage that user skipped for now
    localStorage.setItem('vaultpay_org_skipped', 'true');
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={allowSkip ? onClose : () => {}} title="Create Your Organization" size="md">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🏢</span>
        </div>
        <p className="text-gray-400">
          Set up your organization to start paying your team privately with Arcium MPC encryption.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Organization Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="e.g., Acme DAO"
          error={error}
          helperText="2-50 characters"
          autoFocus
        />

        <div className="flex flex-col gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isCreating}
            disabled={!name.trim()}
          >
            <span>🚀</span>
            Create Organization
          </Button>

          {allowSkip && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          )}
        </div>
      </form>

      <p className="text-center text-gray-500 text-xs mt-4">
        Your connected wallet will be the organization admin.
      </p>
    </Modal>
  );
}
