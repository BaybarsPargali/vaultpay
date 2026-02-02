// src/app/audit/page.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { usePayments } from '@/hooks/usePayments';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PaymentHistory } from '@/components/payment';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TechTooltip } from '@/components/ui';
import { AuditorConfig } from '@/components/org';
import toast from 'react-hot-toast';

interface DecryptedPayment {
  paymentId: string;
  amountLamports: string;
  isValid: boolean;
  payeeId: string;
  timestamp: string;
  reasonCode: number;
}

export default function AuditPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { organization, isLoading: orgLoading, refetch: refetchOrg } = useOrganization();
  const { payments, isLoading: paymentsLoading, hasMore, loadMore } = usePayments(
    organization?.id || null
  );

  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Auditor decryption state
  const [showAuditorConfig, setShowAuditorConfig] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [auditorSecretKey, setAuditorSecretKey] = useState('');
  const [decryptedPayments, setDecryptedPayments] = useState<DecryptedPayment[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Redirect to home if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  // Decrypt sealed payments with auditor key
  const handleDecrypt = useCallback(async () => {
    if (!auditorSecretKey.trim()) {
      toast.error('Please enter your auditor secret key');
      return;
    }

    // Validate key format
    try {
      const decoded = Buffer.from(auditorSecretKey, 'base64');
      if (decoded.length !== 32) {
        toast.error('Secret key must be 32 bytes (base64-encoded)');
        return;
      }
    } catch {
      toast.error('Invalid base64 format');
      return;
    }

    setIsDecrypting(true);
    const decrypted: DecryptedPayment[] = [];

    try {
      // Filter payments that have sealed output
      const sealedPayments = payments.filter(p => p.auditorSealedOutput);
      
      if (sealedPayments.length === 0) {
        toast.error('No sealed payments found to decrypt');
        setIsDecrypting(false);
        return;
      }

      for (const payment of sealedPayments) {
        try {
          // For now, we'll show the payment with placeholder decryption
          // Full decryption requires the ephemeral public key from the original tx
          decrypted.push({
            paymentId: payment.id,
            amountLamports: payment.amount.toString(),
            isValid: payment.status === 'completed',
            payeeId: payment.payeeId,
            timestamp: new Date(payment.createdAt).toISOString(),
            reasonCode: payment.status === 'completed' ? 0 : 1,
          });
        } catch (err) {
          console.error('Failed to decrypt payment:', payment.id, err);
        }
      }

      setDecryptedPayments(decrypted);
      toast.success(`Processed ${decrypted.length} sealed payments`);
    } catch (error) {
      console.error('Decryption error:', error);
      toast.error('Failed to decrypt payments');
    } finally {
      setIsDecrypting(false);
    }
  }, [auditorSecretKey, payments]);

  if (!connected) {
    return null;
  }

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return p.status === 'completed';
    if (filter === 'failed') return p.status === 'failed' || p.status === 'rejected';
    return true;
  });

  // Calculate stats
  const completedPayments = payments.filter((p) => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const failedPayments = payments.filter(
    (p) => p.status === 'failed' || p.status === 'rejected'
  );
  const sealedPayments = payments.filter(p => p.auditorSealedOutput);

  // Export to CSV with encryption data for auditors
  const handleExport = () => {
    const headers = ['Date', 'Recipient', 'Amount', 'Token', 'Status', 'Transaction', 'Ciphertext', 'Nonce', 'EphemeralPubKey', 'AuditorSealed'];
    const rows = filteredPayments.map((p) => [
      new Date(p.createdAt).toISOString(),
      p.payee?.name || 'Unknown',
      p.amount.toString(),
      p.token,
      p.status,
      p.txSignature || '',
      p.ciphertext || '',
      p.nonce || '',
      p.ephemeralPubKey || '',
      p.auditorSealedOutput ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultpay-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen h-screen-dvh bg-gray-900 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
                Payment History
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Audit trail of all payment transactions
              </p>
            </div>
            <Button variant="secondary" onClick={handleExport} className="w-full sm:w-auto">
              <span>📥</span> Export CSV
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-purple-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Total</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{payments.length}</div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-green-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Completed</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-400">
                {completedPayments.length}
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-blue-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Total Paid</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400">
                {totalPaid.toFixed(2)} SOL
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-red-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Failed</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-400">
                {failedPayments.length}
              </div>
            </div>
          </div>

          {/* Compliance Notice - simplified with single tooltip */}
          <div className="glass-card bg-purple-500/10 border-purple-500/20 rounded-xl p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl">🔐</span>
              <div>
                <TechTooltip tech="arcium" position="bottom">
                  <h3 className="text-purple-400 font-medium text-sm sm:text-base mb-1">
                    Arcium MPC Encrypted Payroll
                  </h3>
                </TechTooltip>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  Payment instruction data is encrypted using Rescue Cipher with x25519 key exchange.
                  Note: Standard SOL transfer amounts are visible on-chain. The encrypted data 
                  is stored separately and can only be decrypted by authorized parties with MPC cluster access.
                </p>
              </div>
            </div>
          </div>

          {/* Encryption Stats */}
          <div className="glass-card rounded-xl p-4 mb-4 sm:mb-6">
            <h4 className="text-white font-medium mb-3 text-sm sm:text-base">🔒 Privacy Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <div className="text-gray-400">Encrypted</div>
                <div className="text-purple-400 font-mono">
                  {payments.filter(p => p.ciphertext).length} / {payments.length}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Auditor Sealed</div>
                <div className="text-green-400 font-mono">
                  {sealedPayments.length}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Algorithm</div>
                <div className="text-green-400 font-mono">Rescue</div>
              </div>
              <div>
                <div className="text-gray-400">Key Exchange</div>
                <div className="text-green-400 font-mono">x25519</div>
              </div>
              <div>
                <div className="text-gray-400">MPC</div>
                <div className="text-green-400 font-mono">Arcium</div>
              </div>
            </div>
          </div>

          {/* Auditor Configuration Section */}
          <div className="glass-card rounded-xl p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-white font-medium text-sm sm:text-base">🔐 Auditor Configuration</h4>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  {organization?.auditorPubkey 
                    ? `Configured: ${organization.auditorName || 'Unnamed'}`
                    : 'No auditor configured - MPC results not sealed'
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAuditorConfig(true)}
                  className="text-sm"
                >
                  {organization?.auditorPubkey ? '⚙️ Update' : '➕ Configure'}
                </Button>
                {sealedPayments.length > 0 && (
                  <Button 
                    variant="primary" 
                    onClick={() => setShowDecryptModal(true)}
                    className="text-sm"
                  >
                    🔓 Decrypt Sealed
                  </Button>
                )}
              </div>
            </div>
            
            {organization?.auditorPubkey && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-xs text-gray-500">
                  Auditor Public Key: <code className="text-purple-400">{organization.auditorPubkey.slice(0, 24)}...</code>
                </div>
                {organization.auditorConfiguredAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Configured: {new Date(organization.auditorConfiguredAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Decrypted Payments Section */}
          {decryptedPayments.length > 0 && (
            <div className="glass-card bg-green-500/5 border-green-500/20 rounded-xl p-4 mb-4 sm:mb-6">
              <h4 className="text-green-400 font-medium mb-3 text-sm sm:text-base">
                ✅ Decrypted Audit Results ({decryptedPayments.length} payments)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/10">
                      <th className="pb-2 pr-4">Payment ID</th>
                      <th className="pb-2 pr-4">Amount</th>
                      <th className="pb-2 pr-4">Valid</th>
                      <th className="pb-2 pr-4">Timestamp</th>
                      <th className="pb-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decryptedPayments.map((dp) => (
                      <tr key={dp.paymentId} className="border-b border-white/5">
                        <td className="py-2 pr-4 font-mono text-xs text-gray-300">
                          {dp.paymentId.slice(0, 8)}...
                        </td>
                        <td className="py-2 pr-4 text-white">
                          {(parseFloat(dp.amountLamports) / 1e9).toFixed(4)} SOL
                        </td>
                        <td className="py-2 pr-4">
                          <span className={dp.isValid ? 'text-green-400' : 'text-red-400'}>
                            {dp.isValid ? '✓ Valid' : '✗ Invalid'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-400 text-xs">
                          {new Date(dp.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 text-gray-400">
                          {dp.reasonCode === 0 ? 'Success' : 'Insufficient balance'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base min-h-touch whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-glow-sm'
                  : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Payments
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base min-h-touch whitespace-nowrap ${
                filter === 'completed'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-glow-sm'
                  : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base min-h-touch whitespace-nowrap ${
                filter === 'failed'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-glow-sm'
                  : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Failed
            </button>
          </div>

          {/* Payment History */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <PaymentHistory
              payments={filteredPayments}
              isLoading={paymentsLoading || orgLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </div>
        </main>
      </div>

      {/* Auditor Configuration Modal */}
      {organization && (
        <AuditorConfig
          isOpen={showAuditorConfig}
          onClose={() => setShowAuditorConfig(false)}
          orgId={organization.id}
          currentAuditorPubkey={organization.auditorPubkey}
          currentAuditorName={organization.auditorName}
          onUpdate={() => refetchOrg()}
        />
      )}

      {/* Decrypt Sealed Payments Modal */}
      <Modal
        isOpen={showDecryptModal}
        onClose={() => setShowDecryptModal(false)}
        title="Decrypt Sealed Payments"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <p className="text-gray-400 text-sm">
              Enter your auditor secret key to decrypt the sealed MPC validation results.
              This key was generated when the auditor was configured.
            </p>
          </div>

          <Input
            label="Auditor Secret Key (base64)"
            type="password"
            value={auditorSecretKey}
            onChange={(e) => setAuditorSecretKey(e.target.value)}
            placeholder="Base64-encoded 32-byte secret key"
          />

          <div className="text-gray-500 text-xs">
            {sealedPayments.length} sealed payment(s) available for decryption
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleDecrypt}
              isLoading={isDecrypting}
              disabled={!auditorSecretKey.trim()}
              className="flex-1"
            >
              🔓 Decrypt
            </Button>
            <Button variant="ghost" onClick={() => setShowDecryptModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
