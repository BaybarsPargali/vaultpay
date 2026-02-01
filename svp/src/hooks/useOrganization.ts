// src/hooks/useOrganization.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

import { vaultPayFetch } from '@/lib/auth';
import { Organization } from '@/types';

export function useOrganization() {
  const { publicKey, signMessage } = useWallet();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization for connected wallet
  const fetchOrganization = useCallback(async () => {
    if (!publicKey) {
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const path = `/api/organizations?wallet=${publicKey.toBase58()}`;
      const response = await vaultPayFetch({ publicKey, signMessage }, path);
      
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization); // Will be null if no org exists
      } else {
        throw new Error('Failed to fetch organization');
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organization');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signMessage]);

  // Create new organization
  const createOrganization = useCallback(async (name: string) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const bodyText = JSON.stringify({
        name,
        adminWallet: publicKey.toBase58(),
      });

      const response = await vaultPayFetch({ publicKey, signMessage }, '/api/organizations', {
        method: 'POST',
        body: bodyText,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create organization');
      }

      const data = await response.json();
      setOrganization(data.organization);
      toast.success('Organization created successfully!');
      return data.organization;
    } catch (err) {
      console.error('Error creating organization:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create organization');
      throw err;
    }
  }, [publicKey, signMessage]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    isLoading,
    error,
    createOrganization,
    refetch: fetchOrganization,
  };
}
