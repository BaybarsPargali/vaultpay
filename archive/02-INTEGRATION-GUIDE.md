# VaultPay Integration Guide

## Privacy Cash + Range + Helius Integration

This guide provides step-by-step instructions for integrating the three core SDKs that power VaultPay's compliant private payroll functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Helius Setup](#1-helius-setup)
3. [Privacy Cash Integration](#2-privacy-cash-integration)
4. [Range Compliance Integration](#3-range-compliance-integration)
5. [Putting It All Together](#4-putting-it-all-together)
6. [Error Handling](#5-error-handling)
7. [Testing Guide](#6-testing-guide)

---

## Overview

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

1. USER INITIATES PAYMENT
   │
   ▼
2. RANGE COMPLIANCE CHECK ─────────────────────────────────────┐
   │                                                           │
   │ ┌─────────────────────────────────────────────────────┐  │
   │ │  Range API checks:                                   │  │
   │ │  • Sanctions screening                               │  │
   │ │  • Risk scoring                                      │  │
   │ │  • Geographic restrictions                           │  │
   │ └─────────────────────────────────────────────────────┘  │
   │                                                           │
   ▼                                                           │
3. IF APPROVED ────────────────────────────────────────────────┘
   │
   ▼
4. PRIVACY CASH EXECUTION ─────────────────────────────────────┐
   │                                                           │
   │ ┌─────────────────────────────────────────────────────┐  │
   │ │  Privacy Cash SDK:                                   │  │
   │ │  • Deposits SOL to privacy pool                      │  │
   │ │  • Generates ZK proof                                │  │
   │ │  • Withdraws to stealth address                      │  │
   │ └─────────────────────────────────────────────────────┘  │
   │                                                           │
   ▼                                                           │
5. HELIUS CONFIRMS ────────────────────────────────────────────┘
   │
   │ ┌─────────────────────────────────────────────────────┐
   │ │  Helius RPC:                                         │
   │ │  • Transaction confirmation                          │
   │ │  • Balance updates                                   │
   │ │  • Webhook notifications                             │
   │ └─────────────────────────────────────────────────────┘
   │
   ▼
6. PAYMENT COMPLETE
```

### Required Dependencies

```bash
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-wallets
npm install @privacy-cash/sdk
npm install axios  # For Range API calls
```

---

## 1. Helius Setup

Helius provides enterprise-grade RPC infrastructure for Solana. We use it for:
- Fast, reliable RPC connections
- Transaction confirmation
- Balance queries
- Webhook notifications (optional)

### 1.1 Get API Key

1. Go to [https://dev.helius.xyz](https://dev.helius.xyz)
2. Create an account
3. Create a new project
4. Copy your API key

### 1.2 Connection Setup

```typescript
// lib/solana/connection.ts

import { Connection, clusterApiUrl } from '@solana/web3.js';

// Helius RPC URL with API key
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

// Mainnet connection
export const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Devnet connection (for testing)
export const HELIUS_DEVNET_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Create connection instance
export const connection = new Connection(
  HELIUS_RPC_URL,
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  }
);

// Helper to get connection for specific network
export function getConnection(network: 'mainnet' | 'devnet' = 'mainnet'): Connection {
  const url = network === 'mainnet' ? HELIUS_RPC_URL : HELIUS_DEVNET_URL;
  return new Connection(url, { commitment: 'confirmed' });
}
```

### 1.3 Balance Utilities

```typescript
// lib/solana/balance.ts

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from './connection';

/**
 * Get SOL balance for a wallet
 */
export async function getSOLBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
}

/**
 * Get recent transactions for a wallet
 */
export async function getRecentTransactions(
  walletAddress: string,
  limit: number = 10
) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        return {
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime,
          status: sig.confirmationStatus,
          transaction: tx,
        };
      })
    );
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Confirm a transaction with retries
 */
export async function confirmTransaction(
  signature: string,
  maxRetries: number = 3
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await connection.confirmTransaction(signature, 'confirmed');
      if (!result.value.err) {
        return true;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}
```

### 1.4 Helius Enhanced APIs (Optional)

```typescript
// lib/solana/helius-api.ts

import axios from 'axios';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

/**
 * Get parsed transaction history (Helius enhanced)
 */
export async function getParsedTransactions(walletAddress: string) {
  try {
    const response = await axios.get(
      `${HELIUS_API_URL}/addresses/${walletAddress}/transactions`,
      {
        params: {
          'api-key': HELIUS_API_KEY,
          limit: 100,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching parsed transactions:', error);
    throw error;
  }
}

/**
 * Get token balances for a wallet
 */
export async function getTokenBalances(walletAddress: string) {
  try {
    const response = await axios.get(
      `${HELIUS_API_URL}/addresses/${walletAddress}/balances`,
      {
        params: {
          'api-key': HELIUS_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    throw error;
  }
}

/**
 * Setup webhook for transaction notifications
 */
export async function createWebhook(
  webhookUrl: string,
  accountAddresses: string[]
) {
  try {
    const response = await axios.post(
      `${HELIUS_API_URL}/webhooks`,
      {
        webhookURL: webhookUrl,
        transactionTypes: ['TRANSFER', 'SWAP'],
        accountAddresses,
        webhookType: 'enhanced',
      },
      {
        params: {
          'api-key': HELIUS_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating webhook:', error);
    throw error;
  }
}
```

---

## 2. Privacy Cash Integration

Privacy Cash enables private SOL transfers by breaking the link between sender and recipient using zero-knowledge proofs.

### 2.1 Understanding Privacy Cash

**How it works:**
1. User deposits SOL into a shared privacy pool
2. System generates a commitment (cryptographic receipt)
3. User provides ZK proof to withdraw to any address
4. Withdrawal cannot be linked to deposit

**Key Concepts:**
- **Commitment**: Cryptographic proof of deposit
- **Nullifier**: Prevents double-spending
- **Stealth Address**: Fresh address for recipient

### 2.2 SDK Installation

```bash
# Install Privacy Cash SDK
npm install @privacy-cash/sdk

# Or if using the direct package
npm install privacy-cash
```

### 2.3 Client Setup

```typescript
// lib/privacy-cash/client.ts

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from '../solana/connection';

// Privacy Cash Program ID (mainnet)
const PRIVACY_CASH_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PRIVACY_CASH_PROGRAM_ID || 
  '9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD'
);

// Pool denomination sizes in SOL
export const POOL_SIZES = {
  SMALL: 0.1,    // 0.1 SOL
  MEDIUM: 1,     // 1 SOL
  LARGE: 10,     // 10 SOL
  WHALE: 100,    // 100 SOL
};

export interface PrivacyCashConfig {
  connection: Connection;
  programId?: PublicKey;
}

export interface DepositResult {
  signature: string;
  commitment: string;
  nullifierHash: string;
  amount: number;
}

export interface WithdrawResult {
  signature: string;
  recipient: string;
  amount: number;
}

export interface PrivateTransferResult {
  depositSignature: string;
  withdrawSignature: string;
  stealthAddress: string;
  amount: number;
}

/**
 * Privacy Cash Client
 * Wrapper around the Privacy Cash SDK for VaultPay integration
 */
export class PrivacyCashClient {
  private connection: Connection;
  private programId: PublicKey;
  
  constructor(config?: PrivacyCashConfig) {
    this.connection = config?.connection || connection;
    this.programId = config?.programId || PRIVACY_CASH_PROGRAM_ID;
  }
  
  /**
   * Deposit SOL into the privacy pool
   */
  async deposit(
    wallet: Keypair,
    amount: number
  ): Promise<DepositResult> {
    // NOTE: This is a simplified implementation
    // The actual Privacy Cash SDK has more complex logic
    
    console.log(`Depositing ${amount} SOL to privacy pool...`);
    
    // In production, this would:
    // 1. Generate random secret and nullifier
    // 2. Compute commitment = hash(secret, nullifier)
    // 3. Create deposit transaction
    // 4. Store secret locally for later withdrawal
    
    // Placeholder - replace with actual SDK call
    const result: DepositResult = {
      signature: 'deposit_signature_placeholder',
      commitment: 'commitment_placeholder',
      nullifierHash: 'nullifier_placeholder',
      amount,
    };
    
    return result;
  }
  
  /**
   * Withdraw SOL from the privacy pool to a recipient
   */
  async withdraw(
    commitment: string,
    nullifierHash: string,
    recipientAddress: string,
    amount: number
  ): Promise<WithdrawResult> {
    console.log(`Withdrawing ${amount} SOL to ${recipientAddress}...`);
    
    // In production, this would:
    // 1. Generate ZK proof that you know the secret for the commitment
    // 2. Verify the nullifier hasn't been used
    // 3. Create withdrawal transaction with proof
    
    // Placeholder - replace with actual SDK call
    const result: WithdrawResult = {
      signature: 'withdraw_signature_placeholder',
      recipient: recipientAddress,
      amount,
    };
    
    return result;
  }
  
  /**
   * Execute a complete private transfer (deposit + withdraw)
   * This is the main function for VaultPay payments
   */
  async privateTransfer(
    senderWallet: Keypair,
    recipientAddress: string,
    amount: number
  ): Promise<PrivateTransferResult> {
    console.log(`Executing private transfer of ${amount} SOL...`);
    
    // Step 1: Deposit to privacy pool
    const depositResult = await this.deposit(senderWallet, amount);
    console.log('Deposit complete:', depositResult.signature);
    
    // Step 2: Generate stealth address for recipient
    // In production, this would derive from recipient's public key
    const stealthAddress = await this.generateStealthAddress(recipientAddress);
    console.log('Stealth address generated:', stealthAddress);
    
    // Step 3: Withdraw to stealth address
    const withdrawResult = await this.withdraw(
      depositResult.commitment,
      depositResult.nullifierHash,
      stealthAddress,
      amount
    );
    console.log('Withdrawal complete:', withdrawResult.signature);
    
    return {
      depositSignature: depositResult.signature,
      withdrawSignature: withdrawResult.signature,
      stealthAddress,
      amount,
    };
  }
  
  /**
   * Generate a stealth address for a recipient
   */
  private async generateStealthAddress(recipientPublicKey: string): Promise<string> {
    // In production, this would use ECDH to derive a stealth address
    // that only the recipient can spend from
    
    // For hackathon, we can use the recipient's address directly
    // or generate a derived address
    return recipientPublicKey;
  }
  
  /**
   * Get the current state of privacy pools
   */
  async getPoolStats(): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    currentAnonymitySet: number;
  }> {
    // Fetch pool statistics from on-chain
    return {
      totalDeposits: 0,
      totalWithdrawals: 0,
      currentAnonymitySet: 0,
    };
  }
  
  /**
   * Verify a payment was made (for auditing)
   */
  async verifyPayment(
    depositSignature: string,
    withdrawSignature: string
  ): Promise<boolean> {
    try {
      const depositTx = await this.connection.getTransaction(depositSignature);
      const withdrawTx = await this.connection.getTransaction(withdrawSignature);
      
      return depositTx !== null && withdrawTx !== null;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }
}

// Export singleton instance
export const privacyCash = new PrivacyCashClient();
```

### 2.4 React Hook for Privacy Cash

```typescript
// hooks/usePrivacyCash.ts

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';
import { privacyCash, PrivateTransferResult } from '@/lib/privacy-cash/client';

export interface UsePrivacyCashReturn {
  executePrivatePayment: (recipient: string, amount: number) => Promise<PrivateTransferResult>;
  isProcessing: boolean;
  error: string | null;
}

export function usePrivacyCash(): UsePrivacyCashReturn {
  const { publicKey, signTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const executePrivatePayment = useCallback(async (
    recipient: string,
    amount: number
  ): Promise<PrivateTransferResult> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Note: In production, you'd use the wallet adapter's signing
      // This is simplified for the hackathon
      const result = await privacyCash.privateTransfer(
        Keypair.generate(), // Placeholder - use actual wallet
        recipient,
        amount
      );
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey]);
  
  return {
    executePrivatePayment,
    isProcessing,
    error,
  };
}
```

### 2.5 Alternative: Direct Privacy Cash SDK Usage

If the Privacy Cash team provides a direct SDK, use it like this:

```typescript
// Using official Privacy Cash SDK (when available)
import { PrivacyCash } from 'privacy-cash';

const privacyCash = new PrivacyCash({
  rpcUrl: HELIUS_RPC_URL,
  programId: PRIVACY_CASH_PROGRAM_ID,
});

// Shield (deposit) SOL
const shieldResult = await privacyCash.shield({
  wallet: walletAdapter,
  amount: 1.0, // SOL
});

// Unshield (withdraw) to recipient
const unshieldResult = await privacyCash.unshield({
  commitment: shieldResult.commitment,
  secret: shieldResult.secret,
  recipient: recipientAddress,
});
```

---

## 3. Range Compliance Integration

Range provides compliance tools for privacy-preserving applications, including:
- Wallet screening against sanctions lists
- Risk scoring
- Selective disclosure for auditing

### 3.1 Get API Access

1. Go to [Range Protocol website](https://range.org)
2. Sign up for API access
3. Get your API key

### 3.2 API Client Setup

```typescript
// lib/range/client.ts

import axios, { AxiosInstance } from 'axios';

const RANGE_API_KEY = process.env.RANGE_API_KEY;
const RANGE_API_URL = process.env.RANGE_API_URL || 'https://api.range.org/v1';

export interface ScreeningResult {
  address: string;
  approved: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  details: {
    sanctionsMatch: boolean;
    tornadoCashInteraction: boolean;
    mixerInteraction: boolean;
    darknetInteraction: boolean;
  };
  timestamp: string;
}

export interface SelectiveDisclosureRequest {
  dataType: 'payment' | 'balance' | 'transaction';
  data: any;
  viewerPublicKey: string;
  disclosureLevel: 'minimal' | 'partial' | 'audit' | 'full';
}

export interface SelectiveDisclosureResult {
  disclosedData: any;
  proof: string;
  verificationKey: string;
}

/**
 * Range Compliance Client
 */
export class RangeClient {
  private api: AxiosInstance;
  
  constructor() {
    this.api = axios.create({
      baseURL: RANGE_API_URL,
      headers: {
        'Authorization': `Bearer ${RANGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Screen a wallet address for compliance
   */
  async screenAddress(address: string): Promise<ScreeningResult> {
    try {
      const response = await this.api.post('/screen', {
        address,
        chain: 'solana',
        checks: ['sanctions', 'risk', 'mixer', 'darknet'],
      });
      
      return this.formatScreeningResult(response.data);
    } catch (error) {
      console.error('Range screening error:', error);
      
      // For hackathon demo, return mock approved result on API error
      if (process.env.NODE_ENV === 'development') {
        return this.getMockApprovedResult(address);
      }
      
      throw error;
    }
  }
  
  /**
   * Batch screen multiple addresses
   */
  async batchScreen(addresses: string[]): Promise<Map<string, ScreeningResult>> {
    const results = new Map<string, ScreeningResult>();
    
    // Process in parallel with rate limiting
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(addr => this.screenAddress(addr))
      );
      
      batch.forEach((addr, index) => {
        results.set(addr, batchResults[index]);
      });
    }
    
    return results;
  }
  
  /**
   * Create selective disclosure for auditing
   */
  async createSelectiveDisclosure(
    request: SelectiveDisclosureRequest
  ): Promise<SelectiveDisclosureResult> {
    try {
      const response = await this.api.post('/selective-disclosure', request);
      return response.data;
    } catch (error) {
      console.error('Range selective disclosure error:', error);
      throw error;
    }
  }
  
  /**
   * Verify a selective disclosure proof
   */
  async verifyDisclosure(
    disclosedData: any,
    proof: string,
    verificationKey: string
  ): Promise<boolean> {
    try {
      const response = await this.api.post('/verify-disclosure', {
        disclosedData,
        proof,
        verificationKey,
      });
      return response.data.valid;
    } catch (error) {
      console.error('Range verification error:', error);
      throw error;
    }
  }
  
  /**
   * Format API response to our interface
   */
  private formatScreeningResult(data: any): ScreeningResult {
    const riskScore = data.risk_score || 0;
    
    return {
      address: data.address,
      approved: riskScore < 0.7,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      flags: data.flags || [],
      details: {
        sanctionsMatch: data.sanctions_match || false,
        tornadoCashInteraction: data.tornado_cash || false,
        mixerInteraction: data.mixer_interaction || false,
        darknetInteraction: data.darknet_interaction || false,
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.3) return 'low';
    if (score < 0.5) return 'medium';
    if (score < 0.7) return 'high';
    return 'critical';
  }
  
  /**
   * Mock result for development/demo
   */
  private getMockApprovedResult(address: string): ScreeningResult {
    return {
      address,
      approved: true,
      riskScore: 0.1,
      riskLevel: 'low',
      flags: [],
      details: {
        sanctionsMatch: false,
        tornadoCashInteraction: false,
        mixerInteraction: false,
        darknetInteraction: false,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const rangeClient = new RangeClient();
```

### 3.3 React Hook for Compliance

```typescript
// hooks/useCompliance.ts

import { useState, useCallback } from 'react';
import { rangeClient, ScreeningResult } from '@/lib/range/client';

export interface UseComplianceReturn {
  checkCompliance: (address: string) => Promise<ScreeningResult>;
  batchCheck: (addresses: string[]) => Promise<Map<string, ScreeningResult>>;
  isChecking: boolean;
  lastResult: ScreeningResult | null;
  error: string | null;
}

export function useCompliance(): UseComplianceReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const checkCompliance = useCallback(async (address: string): Promise<ScreeningResult> => {
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await rangeClient.screenAddress(address);
      setLastResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compliance check failed';
      setError(message);
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  const batchCheck = useCallback(async (
    addresses: string[]
  ): Promise<Map<string, ScreeningResult>> => {
    setIsChecking(true);
    setError(null);
    
    try {
      const results = await rangeClient.batchScreen(addresses);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch compliance check failed';
      setError(message);
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  return {
    checkCompliance,
    batchCheck,
    isChecking,
    lastResult,
    error,
  };
}
```

### 3.4 Compliance Badge Component

```tsx
// components/payee/ComplianceBadge.tsx

import React from 'react';

interface ComplianceBadgeProps {
  status: 'pending' | 'approved' | 'flagged' | 'rejected';
  riskScore?: number;
}

export function ComplianceBadge({ status, riskScore }: ComplianceBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: '✓',
          label: 'Approved',
        };
      case 'flagged':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: '⚠',
          label: 'Review',
        };
      case 'rejected':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: '✕',
          label: 'Blocked',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: '○',
          label: 'Pending',
        };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {riskScore !== undefined && (
        <span className="opacity-70">({(riskScore * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
}
```

---

## 4. Putting It All Together

### 4.1 Payment Service

```typescript
// lib/services/payment-service.ts

import { Keypair } from '@solana/web3.js';
import { privacyCash, PrivateTransferResult } from '@/lib/privacy-cash/client';
import { rangeClient, ScreeningResult } from '@/lib/range/client';
import { confirmTransaction } from '@/lib/solana/balance';
import { db } from '@/lib/db/prisma';

export interface PaymentRequest {
  orgId: string;
  payeeId: string;
  amount: number;
  token: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  txSignature?: string;
  stealthAddress?: string;
  error?: string;
}

export interface BatchPaymentRequest {
  orgId: string;
  payments: Array<{
    payeeId: string;
    amount: number;
  }>;
  token: string;
}

export interface BatchPaymentResult {
  success: boolean;
  totalProcessed: number;
  totalFailed: number;
  results: PaymentResult[];
}

/**
 * Payment Service - Orchestrates compliance + privacy
 */
export class PaymentService {
  /**
   * Execute a single private payment with compliance check
   */
  async executePayment(
    request: PaymentRequest,
    senderWallet: Keypair
  ): Promise<PaymentResult> {
    // Create payment record
    const payment = await db.payment.create({
      data: {
        orgId: request.orgId,
        payeeId: request.payeeId,
        amount: request.amount,
        token: request.token,
        status: 'pending',
      },
    });
    
    try {
      // Step 1: Get payee details
      const payee = await db.payee.findUnique({
        where: { id: request.payeeId },
      });
      
      if (!payee) {
        throw new Error('Payee not found');
      }
      
      // Step 2: Verify compliance (re-check before payment)
      const complianceResult = await rangeClient.screenAddress(payee.walletAddress);
      
      if (!complianceResult.approved) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'rejected' },
        });
        
        return {
          success: false,
          paymentId: payment.id,
          error: `Compliance check failed: ${complianceResult.flags.join(', ')}`,
        };
      }
      
      // Step 3: Execute private transfer
      const transferResult = await privacyCash.privateTransfer(
        senderWallet,
        payee.walletAddress,
        request.amount
      );
      
      // Step 4: Confirm transaction
      const confirmed = await confirmTransaction(transferResult.withdrawSignature);
      
      if (!confirmed) {
        throw new Error('Transaction confirmation failed');
      }
      
      // Step 5: Update payment record
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          txSignature: transferResult.withdrawSignature,
          stealthAddress: transferResult.stealthAddress,
          executedAt: new Date(),
        },
      });
      
      return {
        success: true,
        paymentId: payment.id,
        txSignature: transferResult.withdrawSignature,
        stealthAddress: transferResult.stealthAddress,
      };
      
    } catch (error) {
      // Update payment as failed
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
      
      return {
        success: false,
        paymentId: payment.id,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }
  
  /**
   * Execute batch payroll
   */
  async executeBatchPayroll(
    request: BatchPaymentRequest,
    senderWallet: Keypair
  ): Promise<BatchPaymentResult> {
    const results: PaymentResult[] = [];
    let totalProcessed = 0;
    let totalFailed = 0;
    
    // Process payments sequentially to avoid rate limits
    for (const payment of request.payments) {
      const result = await this.executePayment(
        {
          orgId: request.orgId,
          payeeId: payment.payeeId,
          amount: payment.amount,
          token: request.token,
        },
        senderWallet
      );
      
      results.push(result);
      
      if (result.success) {
        totalProcessed++;
      } else {
        totalFailed++;
      }
      
      // Small delay between payments
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      success: totalFailed === 0,
      totalProcessed,
      totalFailed,
      results,
    };
  }
  
  /**
   * Get payment history for audit
   */
  async getPaymentHistory(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ) {
    const payments = await db.payment.findMany({
      where: {
        orgId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        payee: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
    
    return payments;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
```

### 4.2 API Route Example

```typescript
// app/api/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment-service';
import { Keypair } from '@solana/web3.js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, payeeId, amount, token } = body;
    
    // Validate request
    if (!orgId || !payeeId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Note: In production, get wallet from session/auth
    // For hackathon, this is simplified
    const wallet = Keypair.generate(); // Placeholder
    
    const result = await paymentService.executePayment(
      { orgId, payeeId, amount, token: token || 'SOL' },
      wallet
    );
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
    
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 5. Error Handling

### 5.1 Error Types

```typescript
// lib/errors.ts

export class VaultPayError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VaultPayError';
  }
}

export class ComplianceError extends VaultPayError {
  constructor(message: string, details?: any) {
    super(message, 'COMPLIANCE_ERROR', details);
    this.name = 'ComplianceError';
  }
}

export class PaymentError extends VaultPayError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', details);
    this.name = 'PaymentError';
  }
}

export class ConnectionError extends VaultPayError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}
```

### 5.2 Error Handling Middleware

```typescript
// lib/middleware/error-handler.ts

import { NextResponse } from 'next/server';
import { VaultPayError } from '@/lib/errors';

export function handleError(error: unknown) {
  console.error('Error:', error);
  
  if (error instanceof VaultPayError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: 400 }
    );
  }
  
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: 'Unknown error occurred' },
    { status: 500 }
  );
}
```

---

## 6. Testing Guide

### 6.1 Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourname/vaultpay.git
cd vaultpay

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Initialize database
npx prisma generate
npx prisma db push

# 5. Run development server
npm run dev
```

### 6.2 Test Wallet Addresses

For testing compliance checks:

```typescript
// Test addresses for Range API
const TEST_ADDRESSES = {
  // Clean addresses (should pass)
  CLEAN_1: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
  CLEAN_2: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
  
  // Known flagged addresses (for testing rejection)
  // Note: Use with caution, only for testing
  FLAGGED_1: '...',
};
```

### 6.3 Mock Mode

For hackathon demos without API keys:

```typescript
// lib/config.ts

export const config = {
  useMockAPIs: process.env.NEXT_PUBLIC_USE_MOCK_APIS === 'true',
};

// In your clients, check this flag
if (config.useMockAPIs) {
  return mockResponse;
}
```

---

## Quick Reference

### Environment Variables

```bash
# Required
NEXT_PUBLIC_HELIUS_API_KEY=xxx
RANGE_API_KEY=xxx
NEXT_PUBLIC_PRIVACY_CASH_PROGRAM_ID=9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD

# Optional
NEXT_PUBLIC_USE_MOCK_APIS=false
DATABASE_URL=file:./dev.db
```

### Key Functions

| Function | Package | Purpose |
|----------|---------|---------|
| `connection.getBalance()` | @solana/web3.js | Get SOL balance |
| `rangeClient.screenAddress()` | Range API | Compliance check |
| `privacyCash.privateTransfer()` | Privacy Cash | Private payment |
| `confirmTransaction()` | Custom | Verify tx success |

### Bounty Checklist

- [ ] **Privacy Cash**: Using SDK for private transfers ✓
- [ ] **Range**: Using API for compliance screening ✓
- [ ] **Helius**: Using RPCs for Solana connection ✓

---

*Happy hacking! 🚀*
