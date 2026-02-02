// src/app/payees/page.tsx
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
import { PayeeList, AddPayeeModal } from '@/components/payee';
import { PrivatePaymentModal, CTSetupWizard } from '@/components/privacy';
import { Button } from '@/components/ui/Button';
import { TechTooltip } from '@/components/ui';
import type { Payee } from '@/types';

export default function PayeesPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { organization, isLoading: orgLoading } = useOrganization();
  const { payees, isLoading: payeesLoading, addPayee, deletePayee, rescreenPayee } = usePayees(
    organization?.id || null
  );
  const { createPayment, executePayment } = usePayments(organization?.id || null);
  const { balance } = useBalance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCTSetupWizard, setShowCTSetupWizard] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleDeleteClick = async (payee: Payee) => {
    if (confirm(`Are you sure you want to remove ${payee.name}?`)) {
      await deletePayee(payee.id);
    }
  };

  const handleRescreenClick = async (payee: Payee) => {
    await rescreenPayee(payee.id);
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Team Members</h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Manage your team and their compliance status
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
              <span>➕</span> Add Member
            </Button>
          </div>

          {/* Range Compliance Info - single tooltip only */}
          <div className="glass-card bg-green-500/5 border-green-500/20 rounded-xl p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl">🛡️</span>
              <div className="flex-1">
                <TechTooltip tech="range" position="bottom">
                  <h3 className="text-green-400 font-medium text-sm sm:text-base mb-1">
                    Range Protocol Screening
                  </h3>
                </TechTooltip>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  All team members are automatically screened against OFAC sanctions lists and risk databases.
                  Only approved members can receive payments.
                </p>
                <p className="text-yellow-400/80 text-xs mt-2">
                  ⚠️ Devnet: Using mock compliance responses. Set RANGE_API_KEY for production screening.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards - no tooltips here */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-purple-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">Total Members</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{payees.length}</div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-green-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">✅ Approved</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-400">
                {payees.filter((p) => p.rangeStatus === 'approved').length}
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-yellow-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">⏳ Pending</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400">
                {payees.filter((p) => p.rangeStatus === 'pending').length}
              </div>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4 hover:border-orange-500/30 transition-all">
              <div className="text-gray-400 text-xs sm:text-sm">⚠️ Flagged</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-400">
                {payees.filter((p) => p.rangeStatus === 'flagged').length}
              </div>
            </div>
          </div>

          {/* Payee List */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <PayeeList
              payees={payees}
              isLoading={payeesLoading || orgLoading}
              onPayClick={handlePayClick}
              onDeleteClick={handleDeleteClick}
              onRescreenClick={handleRescreenClick}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddPayeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addPayee}
      />

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

      <CTSetupWizard
        isOpen={showCTSetupWizard}
        onClose={() => setShowCTSetupWizard(false)}
        onComplete={() => {
          setShowCTSetupWizard(false);
          // Re-open payment modal if we had a payee selected
          if (selectedPayee) {
            setShowPayModal(true);
          }
        }}
      />
    </div>
  );
}
