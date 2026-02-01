// src/app/dashboard/page.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useBalance } from '@/hooks/useBalance';
import { usePayees } from '@/hooks/usePayees';
import { usePayments } from '@/hooks/usePayments';
import { useConfidentialPayment } from '@/hooks/useConfidentialPayment';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CreateOrgModal } from '@/components/org/CreateOrgModal';
import { PaymentHistory } from '@/components/payment';
import { TechBadge } from '@/components/ui';
import { PrivacyStatusCard, CTSetupWizard } from '@/components/privacy';

export default function DashboardPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { organization, isLoading: orgLoading, createOrganization } = useOrganization();
  const { balance, isLoading: balanceLoading } = useBalance();
  const { payees, isLoading: payeesLoading } = usePayees(organization?.id || null);
  const { payments, isLoading: paymentsLoading } = usePayments(organization?.id || null);
  const {
    isCLIAvailable,
    cliStatus,
    isConfigured,
    configureAccount,
    fetchStatus,
  } = useConfidentialPayment();
  const cliError = cliStatus?.error;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCTSetupWizard, setShowCTSetupWizard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to home if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  // Show create org modal if no org exists
  useEffect(() => {
    if (!orgLoading && !organization && connected) {
      setShowCreateModal(true);
    }
  }, [orgLoading, organization, connected]);

  if (!connected) {
    return null;
  }

  // Calculate stats
  const approvedPayees = payees.filter((p) => p.rangeStatus === 'approved');
  const complianceRate = payees.length > 0 
    ? Math.round((approvedPayees.length / payees.length) * 100) 
    : 100;
  
  const thisMonthPayments = payments.filter((p) => {
    const paymentDate = new Date(p.createdAt);
    const now = new Date();
    return (
      paymentDate.getMonth() === now.getMonth() &&
      paymentDate.getFullYear() === now.getFullYear() &&
      p.status === 'completed'
    );
  });
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const recentPayments = payments.slice(0, 5);

  return (
    <div className="h-screen h-screen-dvh bg-gray-900 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
              Welcome back{organization ? `, ${organization.name}` : ''}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Manage your private payroll and team payments
            </p>
          </div>

          {/* Tech Stack Info Bar - with tooltips */}
          <div className="glass-card rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-gray-400 text-xs sm:text-sm">Powered by:</span>
            <div className="flex flex-wrap items-center gap-2">
              <TechBadge tech="arcium" size="xs" />
              <TechBadge tech="range" size="xs" />
              <TechBadge tech="helius" size="xs" />
              <TechBadge tech="solana" size="xs" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {/* Privacy Status Card - Full width on mobile, 2 cols on larger */}
            <div className="sm:col-span-2 lg:col-span-1">
              <PrivacyStatusCard
                isConfigured={isConfigured}
                isCLIAvailable={isCLIAvailable}
                cliError={cliError}
                onConfigure={() => setShowCTSetupWizard(true)}
              />
            </div>

            {/* Balance Card */}
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-gray-400 text-xs sm:text-sm">Treasury Balance</span>
                <span className="text-xl sm:text-2xl">💰</span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {balanceLoading ? '...' : `${balance?.toFixed(2) || '0'} SOL`}
              </div>
              <div className="text-green-400 text-xs sm:text-sm mt-1">
                Available for payroll
              </div>
            </div>

            {/* Payees Card */}
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-gray-400 text-xs sm:text-sm">Team Members</span>
                <span className="text-xl sm:text-2xl">👥</span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {payeesLoading ? '...' : payees.length}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                Active payees
              </div>
            </div>

            {/* Payments Card */}
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-green-500/30 transition-all">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-gray-400 text-xs sm:text-sm">This Month</span>
                <span className="text-xl sm:text-2xl">📊</span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {paymentsLoading ? '...' : `${thisMonthTotal.toFixed(2)} SOL`}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                Total paid out
              </div>
            </div>

            {/* Compliance Card */}
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-yellow-500/30 transition-all">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-gray-400 text-xs sm:text-sm">Compliance</span>
                <span className="text-xl sm:text-2xl">✅</span>
              </div>
              <div className={`text-lg sm:text-xl md:text-2xl font-bold ${complianceRate === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                {payeesLoading ? '...' : `${complianceRate}%`}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                {approvedPayees.length} of {payees.length} verified
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => router.push('/payees')}
                className="flex items-center gap-3 p-3 sm:p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] min-h-touch"
              >
                <span className="text-xl sm:text-2xl">➕</span>
                <div className="text-left">
                  <div className="text-white font-medium text-sm sm:text-base">Add Payee</div>
                  <div className="text-gray-400 text-xs sm:text-sm">Add a team member</div>
                </div>
              </button>
              
              <button
                onClick={() => router.push('/payroll')}
                className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-glow-sm min-h-touch"
              >
                <span className="text-xl sm:text-2xl">💸</span>
                <div className="text-left">
                  <div className="text-white font-medium text-sm sm:text-base">Run Payroll</div>
                  <span className="text-purple-200 text-xs sm:text-sm">🔐 Data encrypted via MPC</span>
                </div>
              </button>
              
              <button
                onClick={() => router.push('/audit')}
                className="flex items-center gap-3 p-3 sm:p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] min-h-touch"
              >
                <span className="text-xl sm:text-2xl">📋</span>
                <div className="text-left">
                  <div className="text-white font-medium text-sm sm:text-base">View History</div>
                  <div className="text-gray-400 text-xs sm:text-sm">Payment records</div>
                </div>
              </button>
            </div>
          </div>

          {/* Privacy Status Notice */}
          <div className="glass-card bg-purple-500/5 border-purple-500/20 rounded-xl p-4 mb-6 sm:mb-8">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <div className="flex-1">
                <h3 className="text-purple-400 font-medium text-sm sm:text-base mb-2">Privacy Status (Devnet)</h3>
                <ul className="text-gray-400 text-xs sm:text-sm space-y-1">
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Token-2022 CT with real Bulletproof ZK proofs (via official CLI)</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Arcium MPC encrypts payment instruction data</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">○</span> Standard SOL amounts visible (use VPAY token for full privacy)</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">○</span> Compliance uses mock data without RANGE_API_KEY</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Recent Activity</h2>
              {payments.length > 0 && (
                <button
                  onClick={() => router.push('/audit')}
                  className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium"
                >
                  View all →
                </button>
              )}
            </div>
            {paymentsLoading || orgLoading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <span className="animate-spin text-xl sm:text-2xl">⏳</span>
              </div>
            ) : recentPayments.length > 0 ? (
              <PaymentHistory
                payments={recentPayments}
                isLoading={false}
                hasMore={false}
              />
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-400">
                <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">📭</span>
                <p className="text-sm sm:text-base">No recent activity</p>
                <p className="text-xs sm:text-sm">Payments will appear here</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrgModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name) => {
            await createOrganization(name);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* CT Setup Wizard */}
      <CTSetupWizard
        isOpen={showCTSetupWizard}
        onClose={() => setShowCTSetupWizard(false)}
        onComplete={() => {
          fetchStatus();
          setShowCTSetupWizard(false);
        }}
      />
    </div>
  );
}
