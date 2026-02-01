// src/components/payee/PayeeList.tsx
'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { ComplianceBadge } from './ComplianceBadge';
import { Button } from '@/components/ui/Button';
import type { Payee } from '@/types';

interface PayeeListProps {
  payees: Payee[];
  isLoading: boolean;
  onPayClick?: (payee: Payee) => void;
  onDeleteClick?: (payee: Payee) => void;
  onRescreenClick?: (payee: Payee) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function PayeeList({
  payees,
  isLoading,
  onPayClick,
  onDeleteClick,
  onRescreenClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: PayeeListProps) {
  // Truncate wallet address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleSelectAll = () => {
    if (selectedIds.length === payees.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(payees.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="animate-spin text-3xl">⏳</span>
      </div>
    );
  }

  if (payees.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-white mb-2">No team members yet</h3>
        <p className="text-gray-400">
          Add your first team member to start paying them privately.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
            {selectable && (
              <th className="pb-3 pl-4">
                <input
                  type="checkbox"
                  checked={selectedIds.length === payees.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                />
              </th>
            )}
            <th className="pb-3">Name</th>
            <th className="pb-3">Email</th>
            <th className="pb-3">Wallet</th>
            <th className="pb-3">Compliance</th>
            <th className="pb-3 text-right pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {payees.map((payee) => (
            <tr
              key={payee.id}
              className={clsx(
                'hover:bg-gray-800/50 transition',
                selectable &&
                  selectedIds.includes(payee.id) &&
                  'bg-purple-500/10'
              )}
            >
              {selectable && (
                <td className="py-4 pl-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(payee.id)}
                    onChange={() => handleSelectOne(payee.id)}
                    className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                  />
                </td>
              )}
              <td className="py-4">
                <span className="text-white font-medium">{payee.name}</span>
              </td>
              <td className="py-4">
                <span className="text-gray-300">{payee.email}</span>
              </td>
              <td className="py-4">
                <code className="text-gray-400 bg-gray-700/50 px-2 py-1 rounded text-sm">
                  {truncateAddress(payee.walletAddress)}
                </code>
              </td>
              <td className="py-4">
                <ComplianceBadge
                  status={payee.rangeStatus}
                  riskScore={payee.rangeRiskScore}
                  size="sm"
                />
              </td>
              <td className="py-4 pr-4">
                <div className="flex items-center justify-end gap-2">
                  {onRescreenClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRescreenClick(payee)}
                      title="Re-check compliance"
                    >
                      🔄
                    </Button>
                  )}
                  {onPayClick && payee.rangeStatus !== 'rejected' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onPayClick(payee)}
                    >
                      Pay
                    </Button>
                  )}
                  {onDeleteClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteClick(payee)}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
