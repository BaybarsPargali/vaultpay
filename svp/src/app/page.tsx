// src/app/page.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/wallet';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Animated counter component - renders static value on server, animates on client
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(end); // Start with end value to match server
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Only animate once after mount
    if (hasAnimated) return;
    
    setCount(0); // Reset to 0 for animation
    setHasAnimated(true);
    
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    // Small delay to ensure hydration completes first
    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, 100);
    
    return () => {
      clearTimeout(timeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, hasAnimated]);

  return <span suppressHydrationWarning>{count.toLocaleString()}{suffix}</span>;
}

export default function HomePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-specific content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to dashboard when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      router.push('/dashboard');
    }
  }, [connected, publicKey, router]);

  // Show sticky CTA after scrolling
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen min-h-screen-dvh bg-gradient-to-br from-gray-900 via-purple-900/80 to-gray-900 relative gradient-mesh" suppressHydrationWarning>
      {/* Background Glow Effects - Responsive sizing */}
      <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute top-1/3 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 left-1/3 w-36 h-36 sm:w-56 sm:h-56 md:w-72 md:h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '4s' }} />

      {/* Navigation - Mobile optimized */}
      <nav className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 safe-area-padding">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse-glow">
            <span className="text-white font-bold text-lg sm:text-xl">V</span>
          </div>
          <span className="text-white font-bold text-lg sm:text-xl">VaultPay</span>
        </div>
        {mounted ? (
          <WalletButton />
        ) : (
          <button className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg">
            Connect Wallet
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center" suppressHydrationWarning>
        <div className="inline-flex items-center gap-2 bg-purple-500/20 backdrop-blur-md text-purple-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm mb-4 border border-purple-500/30 glass">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></span>
          Live on Solana Devnet
        </div>

        {/* Devnet Beta Disclaimer */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm mb-6 sm:mb-8 max-w-2xl text-center">
          ⚠️ <strong>Devnet Beta</strong> — Not for production use. Some features use simplified implementations pending external SDK releases.
        </div>

        <h1 className="text-responsive-hero font-bold text-white mb-4 sm:mb-6 max-w-4xl px-2">
          Pay Your Team{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 animate-gradient">
            Privately
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-12 max-w-2xl px-2 leading-relaxed">
          Stop exposing your team&apos;s salaries on-chain. VaultPay encrypts payment data with MPC, 
          screens recipients in real-time, and offers Token-2022 confidential treasury balances—all while staying compliant.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 w-full sm:w-auto px-4 sm:px-0">
          {mounted ? (
            <WalletButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !rounded-xl !py-3.5 !px-6 sm:!px-8 !text-base sm:!text-lg !shadow-lg !shadow-purple-500/30 !transition-all hover:!scale-105 !w-full sm:!w-auto" />
          ) : (
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl py-3.5 px-6 sm:px-8 text-base sm:text-lg shadow-lg shadow-purple-500/30 transition-all hover:scale-105 w-full sm:w-auto text-white font-medium">
              Connect Wallet
            </button>
          )}
          <a
            href="#features"
            className="bg-white/10 hover:bg-white/15 text-white rounded-xl py-3.5 px-6 sm:px-8 text-base sm:text-lg transition-all hover:scale-105 backdrop-blur-md border border-white/15 text-center glass"
          >
            Learn More
          </a>
          <a
            href="#roadmap"
            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl py-3.5 px-6 sm:px-8 text-base sm:text-lg transition-all hover:scale-105 backdrop-blur-md border border-purple-500/20 text-center glass"
          >
            View Roadmap
          </a>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 border-y border-white/5 glass">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6 tracking-widest">POWERED BY</p>
          <div className="flex items-center justify-center gap-4 xs:gap-6 sm:gap-8 md:gap-12 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-purple-400 transition-all hover:scale-105">
              <span className="text-lg sm:text-2xl">◈</span>
              <span className="font-semibold text-sm sm:text-base">Arcium</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-green-400 transition-all hover:scale-105">
              <span className="text-lg sm:text-2xl">◎</span>
              <span className="font-semibold text-sm sm:text-base">Solana</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-yellow-400 transition-all hover:scale-105">
              <span className="text-lg sm:text-2xl">⬡</span>
              <span className="font-semibold text-sm sm:text-base">Squads</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-blue-400 transition-all hover:scale-105">
              <span className="text-lg sm:text-2xl">◉</span>
              <span className="font-semibold text-sm sm:text-base">Range</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-orange-400 transition-all hover:scale-105">
              <span className="text-lg sm:text-2xl">⬢</span>
              <span className="font-semibold text-sm sm:text-base">Helius</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 3 Step Visual */}
      <section id="how-it-works" className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
            Three simple steps to private, compliant payroll
          </p>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50"></div>

            {/* Step 1 */}
            <div className="relative glass-card rounded-2xl p-6 sm:p-8 text-center group hover:border-purple-500/30 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl">👛</span>
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Step 1
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Connect Wallet</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                Connect Phantom, Solflare, or Backpack. Create your organization in one click.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative glass-card rounded-2xl p-6 sm:p-8 text-center group hover:border-purple-500/30 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl">👥</span>
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Step 2
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Add Team & Screen</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                Add payees by wallet address. Range auto-screens against OFAC & global watchlists.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative glass-card rounded-2xl p-6 sm:p-8 text-center group hover:border-purple-500/30 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl">🔐</span>
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Step 3
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Pay Privately</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                Execute payments with MPC encryption. Only you and the recipient know the amount.
              </p>
            </div>
          </div>

          {/* Time estimate */}
          <div className="mt-8 sm:mt-12 text-center">
            <span className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 px-4 py-2 rounded-full text-sm border border-purple-500/20">
              <span className="text-lg">⚡</span>
              Setup takes less than 2 minutes
            </span>
          </div>
        </div>
      </section>

      {/* NEW: Privacy Architecture - Dual Implementation */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            True Privacy Architecture
          </h2>
          <p className="text-gray-400 text-center mb-4 sm:mb-6 max-w-2xl mx-auto text-sm sm:text-base">
            Zero-knowledge encryption meets real-time compliance
          </p>

          {/* Dual Implementation Banner */}
          <div className="bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 border border-purple-500/20 rounded-xl p-4 sm:p-6 mb-8 sm:mb-12 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                DUAL PRIVACY IMPLEMENTATION
              </div>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                VaultPay implements <strong className="text-cyan-400">two privacy approaches</strong>: Token-2022 Confidential Transfers (C-SPL) for on-chain amount encryption via ElGamal + ZK proofs, 
                <strong className="text-purple-400"> combined with</strong> Arcium MPC as a Compliance Co-Signer. 
                Amounts are <span className="text-green-400">never visible on-chain</span>—only encrypted ciphertext.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Token-2022 Confidential Transfers */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center hover:border-cyan-500/30 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl">🔒</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-xs mb-2">
                Layer 1: C-SPL
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Token-2022 Confidential</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                Twisted ElGamal encryption with Bulletproof ZK proofs. The network validates math, not data. 
                <span className="text-cyan-400">Amounts encrypted on-chain.</span>
              </p>
            </div>

            {/* Arcium Co-Signer */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center hover:border-purple-500/30 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl">🤝</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs mb-2">
                Layer 2: MPC
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Arcium Co-Signer</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                2-of-2 multisig where Arcium MPC co-signs only after Range compliance check passes. 
                <span className="text-purple-400">No single party controls funds.</span>
              </p>
            </div>

            {/* Non-Custodial */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 text-center hover:border-green-500/30 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl">⚡</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs mb-2">
                Always
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Non-Custodial</h3>
              <p className="text-gray-400 text-sm sm:text-base">
                No escrow contract. Funds move directly from vault to recipient. 
                <span className="text-green-400">Encrypted every step of the way.</span>
              </p>
            </div>
          </div>

          {/* Technical Flow Diagram */}
          <div className="mt-8 sm:mt-12 glass-card rounded-xl p-4 sm:p-6 max-w-4xl mx-auto">
            <h4 className="text-white font-semibold text-sm sm:text-base mb-4 text-center">End-to-End Privacy Flow</h4>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/30">
                <span className="block font-semibold">1. Build TX</span>
                <span className="text-gray-400">CT instruction</span>
              </div>
              <span className="text-gray-500">→</span>
              <div className="bg-cyan-500/20 text-cyan-300 px-3 py-2 rounded-lg border border-cyan-500/30">
                <span className="block font-semibold">2. ZK Proofs</span>
                <span className="text-gray-400">Bulletproofs</span>
              </div>
              <span className="text-gray-500">→</span>
              <div className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg border border-green-500/30">
                <span className="block font-semibold">3. Compliance</span>
                <span className="text-gray-400">Range OFAC</span>
              </div>
              <span className="text-gray-500">→</span>
              <div className="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/30">
                <span className="block font-semibold">4. Co-Sign</span>
                <span className="text-gray-400">Arcium MPC</span>
              </div>
              <span className="text-gray-500">→</span>
              <div className="bg-pink-500/20 text-pink-300 px-3 py-2 rounded-lg border border-pink-500/30">
                <span className="block font-semibold">5. On-Chain</span>
                <span className="text-gray-400">Ciphertext only</span>
              </div>
            </div>
          </div>

          {/* Powered by badges */}
          <div className="mt-8 sm:mt-12 flex items-center justify-center gap-3 flex-wrap">
            <a 
              href="https://spl.solana.com/token-2022/extensions#confidential-transfer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-300 px-4 py-2 rounded-full text-sm border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              <span className="text-lg">◎</span>
              Token-2022 C-SPL
            </a>
            <a 
              href="https://arcium.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 px-4 py-2 rounded-full text-sm border border-purple-500/20 hover:bg-purple-500/20 transition-all"
            >
              <span className="text-lg">◈</span>
              Arcium MPC
            </a>
            <a 
              href="https://range.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500/10 text-green-300 px-4 py-2 rounded-full text-sm border border-green-500/20 hover:bg-green-500/20 transition-all"
            >
              <span className="text-lg">◉</span>
              Range Compliance
            </a>
          </div>
        </div>
      </section>

      {/* Problem/Solution Comparison */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Why VaultPay?
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base px-2">
            Traditional on-chain payroll exposes everything. VaultPay changes that.
          </p>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Traditional Problems */}
            <div className="bg-red-500/5 backdrop-blur-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 border border-red-500/20 hover:border-red-500/40 transition-all">
              <h3 className="text-lg sm:text-xl font-bold text-red-400 mb-4 sm:mb-6 flex items-center gap-2">
                <span>❌</span> Traditional On-Chain Payroll
              </h3>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-2 sm:gap-3 text-gray-400 text-sm sm:text-base">
                  <span className="text-red-400 mt-0.5 sm:mt-1">✗</span>
                  <span>All salaries visible on block explorers</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3 text-gray-400 text-sm sm:text-base">
                  <span className="text-red-400 mt-0.5 sm:mt-1">✗</span>
                  <span>Manual compliance checks for each recipient</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3 text-gray-400 text-sm sm:text-base">
                  <span className="text-red-400 mt-0.5 sm:mt-1">✗</span>
                  <span>Single-signer risk for treasury</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3 text-gray-400 text-sm sm:text-base">
                  <span className="text-red-400 mt-0.5 sm:mt-1">✗</span>
                  <span>Treasury balance exposed to competitors</span>
                </li>
              </ul>
            </div>

            {/* VaultPay Solution */}
            <div className="bg-green-500/5 backdrop-blur-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 border border-green-500/20 hover:border-green-500/40 transition-all">
              <h3 className="text-lg sm:text-xl font-bold text-green-400 mb-4 sm:mb-6 flex items-center gap-2">
                <span>✓</span> VaultPay Private Payroll
              </h3>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                  <span className="text-green-400 mt-0.5 sm:mt-1">✓</span>
                  <span>Payment data encrypted via Arcium MPC</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                  <span className="text-green-400 mt-0.5 sm:mt-1">✓</span>
                  <span>Auto-screening via Range ($35B+ protected)</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                  <span className="text-green-400 mt-0.5 sm:mt-1">✓</span>
                  <span>Squads multi-sig (450+ teams, $15B+ secured)</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                  <span className="text-green-400 mt-0.5 sm:mt-1">✓</span>
                  <span>Token-2022 confidential treasury (devnet preview)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Built For
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
            Privacy-first payroll for the on-chain economy
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/50 hover:bg-white/10 transition-all text-center group">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-4 group-hover:scale-110 transition-transform">🏛️</div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">DAOs</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Pay contributors without exposing your entire treasury</p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-green-500/50 hover:bg-white/10 transition-all text-center group">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-4 group-hover:scale-110 transition-transform">🏢</div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Finance 2.0</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Compliant global payroll with salary privacy</p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-blue-500/50 hover:bg-white/10 transition-all text-center group">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-4 group-hover:scale-110 transition-transform">💼</div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Crypto Funds</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Private LP distributions and team payments</p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-yellow-500/50 hover:bg-white/10 transition-all text-center group">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-4 group-hover:scale-110 transition-transform">👨‍💻</div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Freelancers</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Receive crypto payments without public exposure</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Step by Step */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 md:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
            Get started in minutes with our simple four-step process
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Step 1 */}
            <div className="relative">
              <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-white font-bold text-sm sm:text-base shadow-glow-sm">
                  1
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Connect Wallet</h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Link your Phantom, Backpack, or Solflare wallet
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-2 text-purple-500/50 text-xl sm:text-2xl">→</div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-white font-bold text-sm sm:text-base shadow-glow-sm">
                  2
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Add Team</h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Import your employees and contractors
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-2 text-purple-500/50 text-xl sm:text-2xl">→</div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-green-500/50 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-white font-bold text-sm sm:text-base shadow-glow-green">
                  3
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Compliance Check</h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Auto-screen via Range for sanctions & risk
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-2 text-green-500/50 text-xl sm:text-2xl">→</div>
            </div>

            {/* Step 4 */}
            <div>
              <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-pink-500/50 hover:bg-white/10 transition-all duration-300 h-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-white font-bold text-sm sm:text-base shadow-glow">
                  4
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">Pay Privately</h3>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Execute encrypted payroll via Arcium MPC
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Enterprise-Grade Privacy
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 md:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
            Built with the most advanced privacy and compliance technology on Solana
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Feature 1 */}
            <div className="group glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-purple-500/50 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-purple-500/30 group-hover:scale-110 transition-all">
                <span className="text-xl sm:text-2xl">🔒</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">Arcium MPC Encryption</h3>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base">
                Trustless encrypted computing with guaranteed execution. Staking/slashing mechanisms ensure 
                payments are processed correctly—backed by Arcium&apos;s formally verified MPC protocol.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-green-500/50 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-green-500/30 group-hover:scale-110 transition-all">
                <span className="text-xl sm:text-2xl">✓</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">Range Compliance</h3>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base">
                Real-time sanctions screening trusted by Circle, Solana Foundation, and Jupiter. 
                Travel Rule compliant with AI-powered fraud detection protecting $35B+ in assets.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-blue-500/50 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-blue-500/30 group-hover:scale-110 transition-all">
                <span className="text-xl sm:text-2xl">💎</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">Token-2022 Treasury</h3>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base">
                Confidential treasury balances using Solana&apos;s native Token-2022 program.
                ElGamal encryption keeps your holdings hidden from competitors.
              </p>
            </div>
          </div>

          {/* Additional Features Row */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mt-4 sm:mt-6 md:mt-8">
            {/* Feature 4 */}
            <div className="group glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-yellow-500/50 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-yellow-500/30 group-hover:scale-110 transition-all">
                <span className="text-xl sm:text-2xl">👥</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">Squads Multi-sig</h3>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base">
                Securing $15B+ for 450+ teams. Formally verified smart accounts enforced by 
                Solana&apos;s 1,000+ global validators—not centralized servers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-cyan-500/50 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-cyan-500/30 group-hover:scale-110 transition-all">
                <span className="text-xl sm:text-2xl">🔄</span>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">Recurring Payments</h3>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base">
                Set up automated encrypted payroll—weekly, bi-weekly, or monthly.
                Built on Helius&apos;s 99.99% uptime infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Our Partners Provide - Factual descriptions */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Built on Industry-Leading Infrastructure
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 md:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
            Powered by battle-tested Solana infrastructure
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <a href="https://arcium.com" target="_blank" rel="noopener noreferrer" className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:border-purple-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                  <span className="text-xl sm:text-2xl">◈</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm sm:text-base">Arcium</div>
                  <div className="text-gray-500 text-xs sm:text-sm">MPC Encryption</div>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Multi-Party Computation enabling encrypted payroll with guaranteed execution and staking/slashing.
              </p>
            </a>

            <a href="https://range.org" target="_blank" rel="noopener noreferrer" className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:border-green-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                  <span className="text-xl sm:text-2xl">◉</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm sm:text-base">Range</div>
                  <div className="text-gray-500 text-xs sm:text-sm">Compliance Screening</div>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Real-time OFAC & sanctions screening trusted by Circle, Solana Foundation. $35B+ protected.
              </p>
            </a>

            <a href="https://squads.so" target="_blank" rel="noopener noreferrer" className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:border-yellow-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-yellow-500/30 transition-all">
                  <span className="text-xl sm:text-2xl">⬡</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm sm:text-base">Squads</div>
                  <div className="text-gray-500 text-xs sm:text-sm">Multi-sig Treasury</div>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Formally verified smart accounts securing $15B+ for 450+ teams across Solana.
              </p>
            </a>

            <a href="https://helius.dev" target="_blank" rel="noopener noreferrer" className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:border-orange-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-orange-500/30 transition-all">
                  <span className="text-xl sm:text-2xl">⬢</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm sm:text-base">Helius</div>
                  <div className="text-gray-500 text-xs sm:text-sm">RPC Infrastructure</div>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                SOC 2 certified RPC with 99.99% uptime for reliable Solana connectivity.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Security & Verification Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Enterprise Security
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
            Built on audited, formally verified infrastructure
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center group hover:border-purple-500/30 transition-all">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">🔒</div>
              <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">Formally Verified</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Squads Protocol is formally verified for correctness</p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center group hover:border-blue-500/30 transition-all">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">🛡️</div>
              <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">SOC 2 Compliant</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Helius infrastructure is SOC 2 certified</p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center group hover:border-green-500/30 transition-all">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">⚙️</div>
              <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">Guaranteed Execution</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Arcium staking/slashing ensures reliability</p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center group hover:border-yellow-500/30 transition-all">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">📝</div>
              <h3 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">Travel Rule Ready</h3>
              <p className="text-gray-400 text-xs sm:text-sm">Range handles regulatory requirements</p>
            </div>
          </div>
        </div>
      </section>

      {/* Development Roadmap Section */}
      <section id="roadmap" className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Development Roadmap
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
            Transparent progress on our journey to production
          </p>

          {/* Phase 1 - Complete */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Phase 1: Core Infrastructure</h3>
                <span className="text-green-400 text-xs sm:text-sm font-medium">✅ COMPLETE</span>
              </div>
            </div>
            <div className="ml-5 pl-8 border-l-2 border-green-500/30">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Arcium MPC Integration
                  </div>
                  <p className="text-gray-400 text-xs">Rescue Cipher encryption, MXE initialization, priority fees</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Wallet & Auth
                  </div>
                  <p className="text-gray-400 text-xs">Phantom, Solflare, Backpack with session-based auth</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Payee Management
                  </div>
                  <p className="text-gray-400 text-xs">Add, edit, delete payees with Range compliance screening</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Payment Execution
                  </div>
                  <p className="text-gray-400 text-xs">Single & batch payments with MPC-encrypted instructions</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Auditor Sealing
                  </div>
                  <p className="text-gray-400 text-xs">x25519 encrypted audit logs for compliance officers</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Database & API
                  </div>
                  <p className="text-gray-400 text-xs">Prisma ORM, Next.js API routes, Helius RPC</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2 - Complete */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Phase 2: Token-2022 Confidential Transfers</h3>
                <span className="text-green-400 text-xs sm:text-sm font-medium">✅ COMPLETE (Production-Ready)</span>
              </div>
            </div>
            <div className="ml-5 pl-8 border-l-2 border-green-500/30">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Confidential Mint Deployed
                  </div>
                  <p className="text-gray-400 text-xs">VPAY token with CT extension on devnet</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Real ZK Proofs
                  </div>
                  <p className="text-gray-400 text-xs">Bulletproof proofs via official spl-token CLI</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> CT Setup Wizard
                  </div>
                  <p className="text-gray-400 text-xs">5-step onboarding for confidential transfers</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> CLI Bridge
                  </div>
                  <p className="text-gray-400 text-xs">Production-grade wrapper for spl-token operations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 - Complete */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Phase 3: Production Hardening</h3>
                <span className="text-green-400 text-xs sm:text-sm font-medium">✅ COMPLETE</span>
              </div>
            </div>
            <div className="ml-5 pl-8 border-l-2 border-green-500/30">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Compliance Co-Signer
                  </div>
                  <p className="text-gray-400 text-xs">Arcium MPC 2-of-2 multisig with Range integration</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Privacy Shield Animation
                  </div>
                  <p className="text-gray-400 text-xs">3-step visual: ZK Proofs → Encryption → Compliance</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Rate Limiting & Logging
                  </div>
                  <p className="text-gray-400 text-xs">10 req/min on co-signer, Pino structured logging</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                    <span>✓</span> Docker & Railway
                  </div>
                  <p className="text-gray-400 text-xs">Production Dockerfile with spl-token CLI included</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 4 - In Progress */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-yellow-400 text-xl animate-pulse">◉</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Phase 4: Mainnet & Advanced Features</h3>
                <span className="text-yellow-400 text-xs sm:text-sm font-medium">🔄 IN PROGRESS</span>
              </div>
            </div>
            <div className="ml-5 pl-8 border-l-2 border-yellow-500/30">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 border-yellow-500/20">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                    <span>◉</span> Mainnet Deployment
                  </div>
                  <p className="text-gray-400 text-xs">Security audit + mainnet program deployment</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-yellow-500/20">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                    <span>◉</span> Arcium C-SPL Unified
                  </div>
                  <p className="text-gray-400 text-xs">Single TX: MPC + Token-2022 CT (awaiting SDK)</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-purple-500/20 opacity-80">
                  <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                    <span>◇</span> Multi-Token Support
                  </div>
                  <p className="text-gray-400 text-xs">USDC/USDT Confidential Transfers</p>
                </div>
                <div className="glass-card rounded-xl p-4 border-purple-500/20 opacity-80">
                  <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                    <span>◇</span> Mobile & Enterprise
                  </div>
                  <p className="text-gray-400 text-xs">PWA + advanced reporting dashboard</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm sm:text-base">Devnet Progress</span>
              <span className="text-green-400 font-bold text-sm sm:text-base">100% 🎉</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 rounded-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span className="text-green-400">Core ✓</span>
              <span className="text-green-400">CT ✓</span>
              <span className="text-green-400">Hardening ✓</span>
              <span className="text-yellow-400">Mainnet →</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3 sm:mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 text-center mb-8 sm:mb-12 text-sm sm:text-base">
            Common questions about private payroll
          </p>

          <div className="space-y-3 sm:space-y-4">
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/20 transition-all">
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">Is this legal and compliant?</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Yes. Range provides real-time sanctions screening against OFAC and global watchlists, 
                plus Travel Rule compliance. We encrypt payment amounts—not identities.
              </p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/20 transition-all">
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">How does the encryption work?</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Arcium uses Multi-Party Computation (MPC)—no single party ever sees your data. 
                Computation happens on encrypted values, with results only decryptable by authorized parties.
              </p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/20 transition-all">
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">What if a signer loses their key?</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Squads multi-sig means no single point of failure. Configure 2-of-3 or 3-of-5 thresholds—
                remaining signers can recover access and rotate compromised keys.
              </p>
            </div>
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-purple-500/20 transition-all">
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">Which wallets are supported?</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Phantom, Backpack, and Solflare—the most popular Solana wallets. 
                Connect in seconds and start paying your team privately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center border border-purple-500/20 shadow-2xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">
            Start Paying Privately in 2 Minutes
          </h2>
          <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base max-w-xl mx-auto">
            Connect your wallet, add your team, and execute your first encrypted payment.
            No credit card. No KYC for the platform itself.
          </p>
          {mounted ? (
            <WalletButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !rounded-xl !py-3 sm:!py-4 !px-6 sm:!px-8 !text-base sm:!text-lg !shadow-lg !shadow-purple-500/30 !w-full sm:!w-auto" />
          ) : (
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg shadow-lg shadow-purple-500/30 w-full sm:w-auto text-white font-medium">
              Connect Wallet
            </button>
          )}
          
          {/* Trust Badges - partner infrastructure */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 mt-6 sm:mt-8 text-xs sm:text-sm text-gray-400 flex-wrap">
            <span className="flex items-center gap-1" title="Arcium MPC Encryption">
              <span className="text-purple-400">◈</span> Arcium MPC
            </span>
            <span className="flex items-center gap-1" title="Range Compliance Screening">
              <span className="text-green-400">◉</span> Range Compliant
            </span>
            <span className="flex items-center gap-1" title="Squads Multi-sig">
              <span className="text-yellow-400">⬡</span> Squads Secured
            </span>
            <span className="flex items-center gap-1" title="Helius RPC Infrastructure">
              <span className="text-orange-400">⬢</span> Helius SOC 2
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 border-t border-white/10 glass safe-area-padding">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/30">
              <span className="text-white font-bold text-sm sm:text-base">V</span>
            </div>
            <span className="text-white font-semibold text-sm sm:text-base">VaultPay</span>
          </div>
          
          {/* Powered By - Required for hackathon branding */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 text-gray-400 text-xs sm:text-sm flex-wrap">
            <span className="hidden sm:inline">Secured by</span>
            <a href="https://arcium.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors">
              <span className="text-lg">◈</span>
              <span className="font-semibold">Arcium</span>
            </a>
            <span className="text-gray-600">•</span>
            <a href="https://spl.solana.com/token-2022" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">Token-2022</a>
            <a href="https://squads.so" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 transition-colors">Squads</a>
            <a href="https://range.org" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">Range</a>
            <a href="https://helius.dev" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">Helius</a>
          </div>
          
          <div className="text-gray-400 text-xs sm:text-sm text-center md:text-right">
            <div>© 2026 VaultPay. All rights reserved.</div>
            <div className="text-gray-500 text-xs mt-1">Devnet Beta — Not for production use</div>
          </div>
        </div>
      </footer>

      {/* Sticky CTA - Mobile optimized */}
      {mounted && (
        <div 
          className={`fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 transition-all duration-300 ${showStickyCTA ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <WalletButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !rounded-xl sm:!rounded-full !py-3 !px-6 !shadow-xl !shadow-purple-500/40 !w-full sm:!w-auto !justify-center" />
        </div>
      )}
    </main>
  );
}
