// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ui';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#111827',
};

export const metadata: Metadata = {
  title: 'VaultPay - Compliant Private Payroll',
  description: 'Pay your team privately. Stay compliant. Built on Solana.',
  icons: {
    icon: '/icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VaultPay',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <Providers>
          <ErrorBoundary>
            <div className="flex-1">
              {children}
            </div>
          </ErrorBoundary>
          <Toaster 
            position="bottom-center" 
            toastOptions={{
              className: 'toast-modern',
              style: {
                background: 'rgba(31, 41, 55, 0.95)',
                backdropFilter: 'blur(12px)',
                color: '#fff',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '16px 20px',
                fontSize: '14px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
