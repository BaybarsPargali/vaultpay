// src/app/providers.tsx
'use client';

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Get Helius RPC URL from environment
const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 
  `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  // Empty array - wallets are auto-detected via Standard Wallet interface
  // Phantom, Solflare, etc. register themselves automatically
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={HELIUS_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
