// src/components/wallet/ConnectWalletButton.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { clsx } from 'clsx';
import { useState } from 'react';
import Image from 'next/image';

interface ConnectWalletButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'hero' | 'minimal';
  showAddress?: boolean;
}

export function ConnectWalletButton({
  className,
  size = 'md',
  variant = 'default',
  showAddress = true,
}: ConnectWalletButtonProps) {
  const { publicKey, connected, disconnect, connecting, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [isHovered, setIsHovered] = useState(false);

  // Truncate wallet address
  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const sizeClasses = {
    sm: 'py-2 px-3 text-xs gap-1.5',
    md: 'py-2.5 px-4 text-sm gap-2',
    lg: 'py-3.5 px-6 text-base gap-2.5',
  };

  const variantClasses = {
    default: clsx(
      'bg-gradient-to-r from-purple-600 to-purple-500',
      'hover:from-purple-500 hover:to-purple-400',
      'shadow-lg shadow-purple-500/25',
      'hover:shadow-purple-500/40 hover:scale-[1.02]'
    ),
    hero: clsx(
      'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500',
      'hover:from-purple-600 hover:via-pink-600 hover:to-purple-600',
      'shadow-xl shadow-purple-500/30',
      'hover:shadow-purple-500/50 hover:scale-105',
      'bg-[length:200%_100%] animate-gradient-x'
    ),
    minimal: clsx(
      'bg-white/10 hover:bg-white/20',
      'border border-white/20 hover:border-purple-500/50'
    ),
  };

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'relative inline-flex items-center justify-center font-medium rounded-xl',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        connected ? 'text-white' : 'text-white',
        className
      )}
    >
      {/* Glow effect */}
      {variant === 'hero' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-50 -z-10 group-hover:opacity-75 transition-opacity" />
      )}

      {/* Content */}
      {connecting ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Connecting...</span>
        </>
      ) : connected ? (
        <>
          {/* Wallet Icon */}
          {wallet?.adapter.icon && (
            <Image
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              width={20}
              height={20}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
              unoptimized
            />
          )}
          
          {/* Address or Disconnect */}
          {showAddress && !isHovered && (
            <span className="font-mono">{truncatedAddress}</span>
          )}
          
          {isHovered && (
            <span className="text-red-300">Disconnect</span>
          )}
          
          {/* Status dot */}
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </>
      ) : (
        <>
          {/* Wallet icon */}
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
}

export default ConnectWalletButton;
