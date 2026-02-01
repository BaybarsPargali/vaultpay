// src/lib/solana/connection.ts
import { Connection, clusterApiUrl } from '@solana/web3.js';

// RPC URLs
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';

export const HELIUS_MAINNET_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
export const HELIUS_DEVNET_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Fallback RPC URLs (in case primary fails)
const FALLBACK_MAINNET_URL = 'https://api.mainnet-beta.solana.com';
const FALLBACK_DEVNET_URL = 'https://api.devnet.solana.com';

// Get network from environment
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

// Select RPC URL based on network
export const RPC_URL = NETWORK === 'mainnet-beta' ? HELIUS_MAINNET_URL : HELIUS_DEVNET_URL;
export const FALLBACK_URL = NETWORK === 'mainnet-beta' ? FALLBACK_MAINNET_URL : FALLBACK_DEVNET_URL;

// Create primary connection instance
export const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

// Create fallback connection instance
export const fallbackConnection = new Connection(FALLBACK_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

// Helper to get connection for specific network
export function getConnection(network: 'mainnet-beta' | 'devnet' = 'devnet'): Connection {
  const url = network === 'mainnet-beta' ? HELIUS_MAINNET_URL : HELIUS_DEVNET_URL;
  return new Connection(url, { commitment: 'confirmed' });
}

/**
 * Execute a connection operation with automatic failover
 * Falls back to public RPC if Helius fails
 */
export async function withFailover<T>(
  operation: (conn: Connection) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | undefined;

  // Try primary connection
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation(connection);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RPC] Primary attempt ${i + 1} failed:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }

  // Try fallback connection
  console.warn('[RPC] Primary connection failed, trying fallback...');
  try {
    return await operation(fallbackConnection);
  } catch (error) {
    console.error('[RPC] Fallback connection also failed:', error);
    throw lastError;
  }
}

// Helper to confirm a transaction with failover
export async function confirmTransaction(
  signature: string,
  maxRetries: number = 3
): Promise<boolean> {
  return withFailover(async (conn) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await conn.confirmTransaction(signature, 'confirmed');
        if (!result.value.err) {
          return true;
        }
      } catch (error) {
        console.error(`Confirmation attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return false;
  });
}
