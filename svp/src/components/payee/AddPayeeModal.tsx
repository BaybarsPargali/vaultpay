// src/components/payee/AddPayeeModal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreatePayeeInput, Payee } from '@/types';

// Base58 character set for Solana addresses
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Validate Solana address (base58 check)
function isValidSolanaAddress(address: string): boolean {
  // Check length (32-44 characters)
  if (address.length < 32 || address.length > 44) {
    return false;
  }
  
  // Check all characters are valid base58
  for (const char of address) {
    if (!BASE58_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}

interface AddPayeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Omit<CreatePayeeInput, 'orgId'>) => Promise<Payee | void>;
  existingWallets?: string[]; // For duplicate detection
}

export function AddPayeeModal({ isOpen, onClose, onAdd, existingWallets = [] }: AddPayeeModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    const cleanedAddress = walletAddress.trim();
    if (!cleanedAddress) {
      newErrors.walletAddress = 'Wallet address is required';
    } else if (!isValidSolanaAddress(cleanedAddress)) {
      newErrors.walletAddress = 'Invalid Solana address (must be base58, 32-44 chars)';
    } else if (existingWallets.includes(cleanedAddress)) {
      newErrors.walletAddress = 'This wallet address already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        email: email.trim(),
        walletAddress: walletAddress.trim(),
      });
      handleClose();
    } catch (error) {
      // Error is handled by the parent hook with toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setWalletAddress('');
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Team Member" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <p className="text-gray-400">
            Add a team member to pay them privately. Their wallet will be
            screened for compliance.
          </p>
        </div>

        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Doe"
          error={errors.name}
          autoFocus
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g., john@example.com"
          error={errors.email}
        />

        <Input
          label="Wallet Address"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Solana wallet address"
          error={errors.walletAddress}
          helperText="The Solana address where payments will be sent"
        />

        <div className="flex gap-3 pt-4">
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
            isLoading={isSubmitting}
          >
            Add Member
          </Button>
        </div>

        <p className="text-center text-gray-500 text-xs">
          Wallet addresses are screened via Range for compliance
        </p>
      </form>
    </Modal>
  );
}
