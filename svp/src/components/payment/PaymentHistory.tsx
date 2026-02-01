// src/components/payment/PaymentHistory.tsx
'use client';

import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import type { Payment, PaymentStatus } from '@/types';

interface PaymentHistoryProps {
  payments: Payment[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  onRetry?: (payment: Payment) => void;
  onCancel?: (payment: Payment) => void;
  showPayee?: boolean;
}

export function PaymentHistory({
  payments,
  isLoading,
  hasMore,
  onLoadMore,
  onRetry,
  onCancel,
  showPayee = true,
}: PaymentHistoryProps) {
  const getStatusConfig = (status: PaymentStatus) => {
    const configs = {
      pending: {
        label: 'Pending',
        color: 'bg-yellow-500/20 text-yellow-400',
        icon: '⏳',
      },
      processing: {
        label: 'Processing',
        color: 'bg-blue-500/20 text-blue-400',
        icon: '⚡',
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-500/20 text-green-400',
        icon: '✓',
      },
      failed: {
        label: 'Failed',
        color: 'bg-red-500/20 text-red-400',
        icon: '✕',
      },
      rejected: {
        label: 'Rejected',
        color: 'bg-red-500/20 text-red-400',
        icon: '🚫',
      },
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateSignature = (sig: string) => {
    return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
  };

  if (isLoading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="animate-spin text-3xl">⏳</span>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-white mb-2">No payments yet</h3>
        <p className="text-gray-400">
          Your payment history will appear here after you make your first payment.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3">Date</th>
              {showPayee && <th className="pb-3">Recipient</th>}
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Transaction</th>
              <th className="pb-3 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {payments.map((payment) => {
              const statusConfig = getStatusConfig(payment.status);
              return (
                <tr key={payment.id} className="hover:bg-gray-800/50 transition">
                  <td className="py-4">
                    <span className="text-gray-300 text-sm">
                      {formatDate(payment.createdAt)}
                    </span>
                  </td>
                  {showPayee && (
                    <td className="py-4">
                      {payment.payee ? (
                        <div>
                          <div className="text-white font-medium">
                            {payment.payee.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {payment.encryptedRecipient ? (
                              <span className="text-purple-400">
                                🔒 Private
                              </span>
                            ) : (
                              payment.payee.email
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                  )}
                  <td className="py-4">
                    <div>
                      <span className="text-white font-medium">
                        {(payment.amount ?? 0).toFixed(4)} {payment.token || 'SOL'}
                      </span>
                      {payment.ciphertext && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-purple-400 text-xs">🔐 Encrypted</span>
                          <span 
                            className="text-gray-500 text-xs font-mono cursor-help"
                            title={`Ciphertext: ${payment.ciphertext?.slice(0, 20)}...`}
                          >
                            (MPC)
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        statusConfig.color
                      )}
                    >
                      <span>{statusConfig.icon}</span>
                      <span>{statusConfig.label}</span>
                    </span>
                  </td>
                  <td className="py-4">
                    {payment.txSignature ? (
                      <a
                        href={`https://solscan.io/tx/${payment.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm font-mono"
                      >
                        {truncateSignature(payment.txSignature)}
                      </a>
                    ) : (
                      <span className="text-gray-500 text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      {payment.status === 'failed' && onRetry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(payment)}
                        >
                          Retry
                        </Button>
                      )}
                      {payment.status === 'pending' && onCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(payment)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            isLoading={isLoading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
