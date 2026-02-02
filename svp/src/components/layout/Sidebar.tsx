// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { FooterCompact } from './Footer';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/payees', label: 'Team Members', icon: '👥' },
  { href: '/payroll', label: 'Payroll', icon: '💸' },
  { href: '/audit', label: 'History', icon: '📋' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile && onClose) {
      onClose();
    }
  }, [pathname, isMobile, onClose]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className={clsx(
            'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          'fixed md:static inset-y-0 left-0 z-50',
          'w-64 sm:w-72 md:w-64',
          'bg-gray-800 md:bg-gray-800',
          'border-r border-gray-700/50',
          'flex flex-col',
          'transition-transform duration-300',
          'safe-area-padding',
          // Mobile: slide in/out
          isMobile && !isOpen && '-translate-x-full',
          isMobile && isOpen && 'translate-x-0 shadow-2xl'
        )}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)', // Smooth iOS-like easing
        }}
      >
        {/* Logo */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-gray-700/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-glow-sm">
              <span className="text-white font-bold text-lg sm:text-xl">V</span>
            </div>
            <span className="text-white font-bold text-lg sm:text-xl">VaultPay</span>
          </div>
          
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <ul className="space-y-1 sm:space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all duration-200',
                    'min-h-touch', // Touch-friendly
                    pathname === item.href
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-glow-sm'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white active:scale-98'
                  )}
                >
                  <span className="text-lg sm:text-xl">{item.icon}</span>
                  <span className="text-sm sm:text-base font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer with Arcium Branding */}
        <FooterCompact />
      </aside>
    </>
  );
}
