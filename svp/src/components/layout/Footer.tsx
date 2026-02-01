// src/components/layout/Footer.tsx
'use client';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-gray-800/50 border-t border-gray-700/50 py-4 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Powered By Section */}
        <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
          <span className="text-gray-500 text-xs">Secured by</span>
          
          {/* Arcium Badge - Primary (Bounty Requirement) */}
          <a
            href="https://arcium.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition group"
          >
            <span className="text-lg">◈</span>
            <span className="text-purple-400 text-xs font-medium group-hover:text-purple-300">
              Arcium MPC
            </span>
          </a>
          
          {/* Token-2022 Badge */}
          <a
            href="https://spl.solana.com/token-2022"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-lg hover:bg-teal-500/20 transition group"
          >
            <span className="text-lg">◎</span>
            <span className="text-teal-400 text-xs font-medium group-hover:text-teal-300">
              Token-2022 CT
            </span>
          </a>

          {/* Range Badge */}
          <a
            href="https://range.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition group"
          >
            <span className="text-lg">◉</span>
            <span className="text-green-400 text-xs font-medium group-hover:text-green-300">
              Range Compliant
            </span>
          </a>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <a
            href="https://github.com/BaybarsPargali/vaultpay"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition"
          >
            GitHub
          </a>
          <span className="text-gray-700">|</span>
          <a
            href="https://explorer.solana.com/address/ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition"
          >
            On-Chain Program
          </a>
          <span className="text-gray-700">|</span>
          <span className="text-gray-600">v1.0.0</span>
        </div>
      </div>

      {/* Hackathon Attribution */}
      <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-gray-700/30">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <span className="text-gray-500 text-xs">
            Built with 💜 for the Solana Hackathon
          </span>
          <span className="hidden sm:inline text-gray-700">•</span>
          <span className="text-gray-600 text-xs">
            First payroll with cryptographically private payment amounts
          </span>
        </div>
      </div>
    </footer>
  );
}

// Compact version for use in dashboard sidebar
export function FooterCompact() {
  return (
    <div className="p-3 sm:p-4 border-t border-gray-700/50">
      <div className="glass-card rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-green-400 text-xs sm:text-sm font-medium">Compliant</span>
        </div>
        <p className="text-gray-400 text-xs mb-2">
          Secured by Arcium MPC Co-Signer
        </p>
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded border border-purple-500/20">
            ◈ Arcium
          </span>
          <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 text-xs rounded border border-teal-500/20">
            ◎ Token-2022
          </span>
          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
            ◉ Range
          </span>
        </div>
      </div>
    </div>
  );
}
