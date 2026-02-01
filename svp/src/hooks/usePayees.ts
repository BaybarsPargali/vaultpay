// src/hooks/usePayees.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import type { Payee, CreatePayeeInput } from '@/types';

import { vaultPayFetch } from '@/lib/auth';

interface UsePayeesReturn {
  payees: Payee[];
  isLoading: boolean;
  error: string | null;
  addPayee: (data: Omit<CreatePayeeInput, 'orgId'>) => Promise<Payee>;
  updatePayee: (id: string, data: Partial<Payee>) => Promise<Payee>;
  deletePayee: (id: string) => Promise<void>;
  rescreenPayee: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePayees(orgId: string | null): UsePayeesReturn {
  const { publicKey, signMessage } = useWallet();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayees = useCallback(async () => {
    if (!orgId) {
      setPayees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const path = `/api/payees?orgId=${orgId}`;
      const response = await vaultPayFetch({ publicKey, signMessage }, path);

      if (!response.ok) {
        throw new Error('Failed to fetch payees');
      }

      const data = await response.json();
      setPayees(data.payees);
    } catch (err) {
      console.error('Error fetching payees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payees');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, publicKey, signMessage]);

  const addPayee = useCallback(
    async (data: Omit<CreatePayeeInput, 'orgId'>): Promise<Payee> => {
      if (!orgId) {
        throw new Error('No organization selected');
      }

      try {
        const bodyText = JSON.stringify({
          ...data,
          orgId,
        });

        const response = await vaultPayFetch({ publicKey, signMessage }, '/api/payees', {
          method: 'POST',
          body: bodyText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add payee');
        }

        const { payee } = await response.json();
        setPayees((prev) => [payee, ...prev]);
        toast.success('Team member added successfully!');
        return payee;
      } catch (err) {
        console.error('Error adding payee:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to add payee');
        throw err;
      }
    },
    [orgId, publicKey, signMessage]
  );

  const updatePayee = useCallback(
    async (id: string, data: Partial<Payee>): Promise<Payee> => {
      try {
        const bodyText = JSON.stringify(data);
        const response = await vaultPayFetch({ publicKey, signMessage }, `/api/payees/${id}`, {
          method: 'PATCH',
          body: bodyText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update payee');
        }

        const { payee } = await response.json();
        setPayees((prev) => prev.map((p) => (p.id === id ? payee : p)));
        toast.success('Team member updated!');
        return payee;
      } catch (err) {
        console.error('Error updating payee:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to update payee');
        throw err;
      }
    },
    [publicKey, signMessage]
  );

  const deletePayee = useCallback(
    async (id: string): Promise<void> => {
      try {
        const response = await vaultPayFetch({ publicKey, signMessage }, `/api/payees/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete payee');
        }

        setPayees((prev) => prev.filter((p) => p.id !== id));
        toast.success('Team member removed!');
      } catch (err) {
        console.error('Error deleting payee:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete payee');
        throw err;
      }
    },
    [publicKey, signMessage]
  );

  const rescreenPayee = useCallback(
    async (id: string): Promise<void> => {
      try {
        const response = await vaultPayFetch({ publicKey, signMessage }, `/api/payees/${id}`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to rescreen payee');
        }

        const { payee } = await response.json();
        setPayees((prev) => prev.map((p) => (p.id === id ? payee : p)));
        toast.success('Compliance check completed!');
      } catch (err) {
        console.error('Error rescreening payee:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to rescreen payee');
        throw err;
      }
    },
    [publicKey, signMessage]
  );

  useEffect(() => {
    fetchPayees();
  }, [fetchPayees]);

  return {
    payees,
    isLoading,
    error,
    addPayee,
    updatePayee,
    deletePayee,
    rescreenPayee,
    refetch: fetchPayees,
  };
}
