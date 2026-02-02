// src/components/ui/TechTooltip.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

// Tech stack information that aligns with actual VaultPay integrations
export const TECH_INFO = {
  // Core Privacy Tech - Updated for Co-Signer architecture
  arcium: {
    name: 'Arcium Co-Signer',
    icon: '🔐',
    color: 'purple',
    shortDesc: 'MPC Compliance Gatekeeper',
    fullDesc: 'We use Arcium Multi-Party Computation as a "Compliance Co-Signer". Transactions require 2-of-2 signatures: yours and Arcium\'s. Arcium only co-signs if the recipient passes compliance screening. The amount is NEVER visible to anyone.',
    features: ['2-of-2 MultiSig Pattern', 'Compliance Gating', 'No Custody of Funds', 'MPC-Distributed Keys'],
    link: 'https://arcium.com',
  },
  
  // Token-2022 Confidential Transfers
  token2022: {
    name: 'Token-2022 Confidential',
    icon: '🔒',
    color: 'cyan',
    shortDesc: 'Native Solana Encryption',
    fullDesc: 'Native Solana encryption standard (Token-2022 Extension). Your balance and transfer amounts are converted to ciphertexts using ElGamal encryption. Only you (and the holder of the viewing key) can see the real numbers.',
    features: ['ElGamal Encryption', 'Bulletproof ZK Proofs', 'On-chain Privacy', 'Native to Solana'],
    link: 'https://spl.solana.com/token-2022',
  },
  
  // Compliance
  range: {
    name: 'Range Protocol',
    icon: '🛡️',
    color: 'green',
    shortDesc: 'Compliance Screening',
    fullDesc: 'Range provides real-time wallet screening and risk assessment. Every payee is automatically screened against global sanctions lists (OFAC, UN, EU) and risk databases before payments are allowed. $35B+ protected.',
    features: ['Real-time Wallet Screening', 'Risk Score Analysis', 'OFAC/Sanctions Checks', 'Continuous Monitoring'],
    link: 'https://range.org',
  },
  
  // Infrastructure
  helius: {
    name: 'Helius RPC',
    icon: '⬢',
    color: 'orange',
    shortDesc: 'Enterprise Solana Infrastructure',
    fullDesc: 'Helius provides high-performance RPC infrastructure for Solana with 99.99% uptime. SOC 2 certified with enterprise-grade reliability for all blockchain operations.',
    features: ['99.99% Uptime SLA', 'SOC 2 Certified', 'Enhanced Transaction APIs', 'Webhook Notifications'],
    link: 'https://helius.dev',
  },
  
  // Blockchain
  solana: {
    name: 'Solana',
    icon: '◎',
    color: 'cyan',
    shortDesc: 'High-Speed Blockchain',
    fullDesc: 'Solana is the blockchain layer powering VaultPay. With 400ms block times and sub-cent transaction fees, it enables fast, affordable private payments.',
    features: ['400ms Block Times', '<$0.01 Transaction Fees', '65,000+ TPS Capacity', 'Proof of History'],
    link: 'https://solana.com',
  },
  
  // Encryption specifics - Keep for backward compat
  rescue: {
    name: 'Rescue Cipher',
    icon: '🔒',
    color: 'purple',
    shortDesc: 'Arcium Encryption Algorithm',
    fullDesc: 'Rescue is a ZK-friendly algebraic hash function used by Arcium for encrypting payment amounts. It enables efficient encryption within MPC computations.',
    features: ['ZK-Friendly Design', 'Algebraic Structure', 'MPC-Optimized', 'Formally Verified'],
    link: 'https://arcium.com/docs',
  },
  
  x25519: {
    name: 'x25519 ECDH',
    icon: '🔑',
    color: 'indigo',
    shortDesc: 'Key Exchange Protocol',
    fullDesc: 'x25519 is the elliptic curve Diffie-Hellman key exchange used for secure key derivation. Each payment generates an ephemeral key pair for forward secrecy.',
    features: ['Elliptic Curve Cryptography', 'Forward Secrecy', 'Ephemeral Keys', '256-bit Security'],
    link: 'https://en.wikipedia.org/wiki/Curve25519',
  },
  
  // Wallet
  phantom: {
    name: 'Phantom Wallet',
    icon: '👻',
    color: 'violet',
    shortDesc: 'Solana Wallet',
    fullDesc: 'Phantom is the most popular Solana wallet with over 3 million users. Connect securely to manage your organization\'s treasury.',
    features: ['Hardware Wallet Support', 'Transaction Simulation', 'Multi-chain Support', 'dApp Browser'],
    link: 'https://phantom.app',
  },
  
  // Multi-sig Infrastructure
  squads: {
    name: 'Squads Protocol',
    icon: '⬡',
    color: 'yellow' as const,
    shortDesc: 'Multi-sig Treasury',
    fullDesc: 'Squads is the leading multi-sig solution on Solana, securing $15B+ in assets for 450+ teams. Formally verified smart accounts enforce on-chain governance.',
    features: ['Formally Verified', 'Custom Thresholds', 'Role-Based Access', 'Spending Limits'],
    link: 'https://squads.so',
  },
} as const;

export type TechKey = keyof typeof TECH_INFO;

interface TechTooltipProps {
  tech: TechKey;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  inline?: boolean;
}

const colorClasses = {
  purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
  green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
  blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
  cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
  indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 text-indigo-400',
  violet: 'from-violet-500/20 to-violet-600/20 border-violet-500/30 text-violet-400',
  yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400',
  orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400',
};

export function TechTooltip({
  tech,
  children,
  position = 'top',
  showIcon = true,
  inline = false,
}: TechTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const info = TECH_INFO[tech];

  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const padding = 16; // Viewport padding
      
      let x = 0;
      let y = 0;
      let actualPosition = position;

      // Calculate initial position
      switch (position) {
        case 'top':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.top - tooltipRect.height - 8;
          // Flip to bottom if not enough space at top
          if (y < padding) {
            y = triggerRect.bottom + 8;
            actualPosition = 'bottom';
          }
          break;
        case 'bottom':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.bottom + 8;
          // Flip to top if not enough space at bottom
          if (y + tooltipRect.height > window.innerHeight - padding) {
            y = triggerRect.top - tooltipRect.height - 8;
            actualPosition = 'top';
          }
          break;
        case 'left':
          x = triggerRect.left - tooltipRect.width - 8;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          break;
        case 'right':
          x = triggerRect.right + 8;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          break;
      }

      // Keep tooltip strictly in viewport with padding
      x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
      y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

      setTooltipPosition({ x, y });
    }
  }, [isOpen, position]);

  // State to track if we're mounted (for portal)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        className={clsx(
          'cursor-help border-b border-dashed border-current/50 hover:border-current transition-colors',
          inline ? 'inline' : 'inline-flex items-center gap-1'
        )}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {showIcon && <span className="text-sm">{info.icon}</span>}
        {children}
      </span>

      {isOpen && isMounted && createPortal(
        <div
          ref={tooltipRef}
          className="fixed w-72 sm:w-80 pointer-events-none animate-fade-in"
          style={{ 
            left: tooltipPosition.x, 
            top: tooltipPosition.y,
            zIndex: 99999, // Maximum z-index to ensure visibility above everything
          }}
        >
          {/* Solid opaque background for readability */}
          <div className="bg-gray-900 border border-gray-600 rounded-xl p-4 shadow-2xl" 
               style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)' }}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{info.icon}</span>
              <div>
                <h4 className="font-semibold text-white text-sm">{info.name}</h4>
                <p className={clsx('text-xs', `text-${info.color}-400`)}>{info.shortDesc}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              {info.fullDesc}
            </p>

            {/* Features */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {info.features.map((feature) => (
                <span
                  key={feature}
                  className="text-[10px] px-2 py-0.5 bg-gray-700 rounded-full text-gray-200"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Link hint */}
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <span>🔗</span>
              <span>{info.link.replace('https://', '')}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Compact badge version for inline use
interface TechBadgeProps {
  tech: TechKey;
  size?: 'xs' | 'sm' | 'md';
}

export function TechBadge({ tech, size = 'sm' }: TechBadgeProps) {
  const info = TECH_INFO[tech];
  
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
  };

  return (
    <TechTooltip tech={tech} showIcon={false}>
      <span className={clsx(
        'inline-flex items-center rounded-full border bg-gradient-to-r font-medium',
        colorClasses[info.color],
        sizeClasses[size]
      )}>
        <span>{info.icon}</span>
        <span>{info.name}</span>
      </span>
    </TechTooltip>
  );
}

// Info icon trigger for tooltips
interface TechInfoIconProps {
  tech: TechKey;
  className?: string;
}

export function TechInfoIcon({ tech, className }: TechInfoIconProps) {
  const info = TECH_INFO[tech];
  
  return (
    <TechTooltip tech={tech} showIcon={false}>
      <span className={clsx(
        'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] cursor-help',
        'bg-white/10 hover:bg-white/20 transition-colors',
        className
      )}>
        ?
      </span>
    </TechTooltip>
  );
}
