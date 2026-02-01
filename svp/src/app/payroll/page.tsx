// src/app/payroll/page.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { usePayees } from '@/hooks/usePayees';
import { usePayments } from '@/hooks/usePayments';
import { useBalance } from '@/hooks/useBalance';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PayeeList } from '@/components/payee';
import { BatchPayroll, PaymentHistory } from '@/components/payment';
import { PrivatePaymentModal, CTSetupWizard } from '@/components/privacy';
import { Button } from '@/components/ui/Button';
import { TechTooltip } from '@/components/ui';
import type { Payee } from '@/types';

export default function PayrollPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { organization, isLoading: orgLoading } = useOrganization();
  const { payees, isLoading: payeesLoading } = usePayees(organization?.id || null);
  const {
    payments,
    isLoading: paymentsLoading,
    hasMore,
    createPayment,
    executePayment,
    cancelPayment,
    createBatchPayments,
    loadMore,
  } = usePayments(organization?.id || null);
  const { balance } = useBalance();

  const [showPayModal, setShowPayModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [activeTab, setActiveTab] = useState<'quick-pay' | 'history'>('quick-pay');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCTSetupWizard, setShowCTSetupWizard] = useState(false);

  // Redirect to home if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) {
    return null;
  }

  const handlePayClick = (payee: Payee) => {
    setSelectedPayee(payee);
    setShowPayModal(true);
  };

  const handlePay = async (payeeId: string, amount: number) => {
    const payment = await createPayment({ payeeId, amount });
    await executePayment(payment.id);
  };

  const handleBatchPayroll = async (
    paymentData: { payeeId: string; amount: number }[]
  ): Promise<{ txSignature?: string }> => {
    const payments = await createBatchPayments(paymentData);
    let lastTxSignature: string | undefined;
    
    // Execute all payments sequentially
    for (const payment of payments) {
      try {
        const result = await executePayment(payment.id);
        lastTxSignature = result?.txSignature;
      } catch (error) {
        console.error(`Failed to execute payment ${payment.id}:`, error);
      }
    }
    
    return { txSignature: lastTxSignature };
  };

  // Calculate stats
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const thisMonthPayments = payments.filter((p) => {
    const paymentDate = new Date(p.createdAt);
    const now = new Date();
    return (
      paymentDate.getMonth() === now.getMonth() &&
      paymentDate.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => {
    return p.status === 'completed' ? sum + p.amount : sum;
  }, 0);

  return (
    <div className="h-screen h-screen-dvh bg-gray-900 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Payroll</h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Execute private payments to your team
              </p>
            </div>
            <Button onClick={() => setShowBatchModal(true)} className="w-full sm:w-auto">
              <span>📋</span> Run Payroll
            </Button>
          </div>

          {/* Privacy Tech Info */}
          <div className="glass-card bg-purple-500/5 border-purple-500/20 rounded-xl p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl">🔐</span>
              <div className="flex-1">
                <TechTooltip tech="arcium" position="bottom">
                  <h3 className="text-purple-400 font-medium text-sm sm:text-base mb-1">
                    Private Payments with Token-2022 CT
                  </h3>
                </TechTooltip>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  Payment amounts are encrypted using Twisted ElGamal encryption. Enable &quot;Private Mode&quot; 
                  when paying to hide amounts on-chain. Standard payments use Arcium MPC encryption.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-purple-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Treasury</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {balance?.toFixed(2) || '0'} SOL
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-green-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">This Month</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-400">
                {thisMonthTotal.toFixed(2)} SOL
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-yellow-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Pending</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400">
                {pendingPayments.length}
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-blue-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Total</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{payments.length}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
            <button
              onClick={() => setActiveTab('quick-pay')}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base min-h-touch ${
                activeTab === 'quick-pay'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-glow-sm'
                  : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Quick Pay
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base min-h-touch ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-glow-sm'
                  : 'glass-card text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              History
            </button>
          </div>

          {/* Content */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            {activeTab === 'quick-pay' ? (
              <PayeeList
                payees={payees}
                isLoading={payeesLoading || orgLoading}
                onPayClick={handlePayClick}
              />
            ) : (
              <PaymentHistory
                payments={payments}
                isLoading={paymentsLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onCancel={(p) => cancelPayment(p.id)}
                onRetry={(p) => executePayment(p.id)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <PrivatePaymentModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setSelectedPayee(null);
        }}
        payee={selectedPayee}
        onPayStandard={handlePay}
        balance={balance}
        onSetupPrivacy={() => {
          setShowPayModal(false);
          setShowCTSetupWizard(true);
        }}
      />

      <BatchPayroll
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        payees={payees}
        onExecute={handleBatchPayroll}
      />

      <CTSetupWizard
        isOpen={showCTSetupWizard}
        onClose={() => setShowCTSetupWizard(false)}
        onComplete={() => {
          setShowCTSetupWizard(false);
        }}
      />
    </div>
  );
}
