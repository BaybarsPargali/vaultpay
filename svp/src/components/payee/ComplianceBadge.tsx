// src/components/payee/ComplianceBadge.tsx
'use client';

import { clsx } from 'clsx';
import type { RangeStatus } from '@/types';

interface ComplianceBadgeProps {
  status: RangeStatus;
  riskScore?: number | null;
  size?: 'sm' | 'md';
}

export function ComplianceBadge({
  status,
  riskScore,
  size = 'md',
}: ComplianceBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: '⏳',
    },
    approved: {
      label: 'Approved',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: '✓',
    },
    flagged: {
      label: 'Review',
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      icon: '⚠',
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: '✕',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border font-medium',
          config.color,
          sizes[size]
        )}
        title={`Range Protocol: ${config.label}`}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
      {riskScore !== null && riskScore !== undefined && (
        <span 
          className="text-xs text-gray-400"
          title="Range Protocol Risk Score"
        >
          Risk: {(riskScore * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
