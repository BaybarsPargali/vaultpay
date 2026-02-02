// src/components/layout/Header.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { ConnectWalletButton } from '@/components/wallet';
import { useBalance } from '@/hooks/useBalance';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

// Check if we're on devnet
const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';

export function Header({ onMenuClick, showMenuButton = true }: HeaderProps) {
  const { publicKey } = useWallet();
  const { balance } = useBalance();

  return (
    <>
      {/* Devnet Warning Banner */}
      {isDevnet && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-center">
          <p className="text-yellow-400 text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
            <span>🧪</span>
            <span>Running on Solana Devnet - No Real Funds</span>
            <span className="hidden sm:inline text-yellow-600">|</span>
            <a 
              href="https://faucet.solana.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:inline underline hover:text-yellow-300 transition"
            >
              Get Test SOL
            </a>
          </p>
        </div>
      )}
      
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-gray-800/95 backdrop-blur-xl border-b border-gray-700/50 flex items-center justify-between px-4 sm:px-6 safe-area-padding">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile menu button */}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 min-w-touch min-h-touch flex items-center justify-center"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Balance Display - no tooltip */}
          {balance !== null && (
            <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 bg-gray-700/50 backdrop-blur-sm px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-600/30">
              <span className="text-purple-400 text-xs sm:text-sm">◎</span>
              <span className="text-white font-medium text-xs sm:text-sm">{balance.toFixed(2)}</span>
              <span className="text-gray-400 text-xs hidden sm:inline">SOL</span>
            </div>
          )}

          {/* Connect Wallet Button */}
          <ConnectWalletButton size="md" variant="default" />
        </div>
      </header>
    </>
  );
}
