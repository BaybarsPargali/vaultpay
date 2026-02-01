// src/components/wallet/WalletButton.tsx
'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletMultiButton with SSR disabled to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { 
    ssr: false,
    loading: () => (
      <button className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg">
        Loading...
      </button>
    )
  }
);

interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className }: WalletButtonProps) {
  return <WalletMultiButton className={className} />;
}

export default WalletButton;
