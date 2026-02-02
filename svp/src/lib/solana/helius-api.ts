// src/lib/solana/helius-api.ts
// Helius Enhanced API Utilities

import axios from 'axios';
import { connection } from './connection';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_API_URL = 'https://api.helius.xyz/v0';

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
    console.error('[Helius] Error fetching parsed transactions:', error);
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
    console.error('[Helius] Error fetching token balances:', error);
    throw error;
  }
}

/**
 * Get SOL balance for a wallet
 */
export async function getSOLBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('[Helius] Error fetching SOL balance:', error);
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
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });

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
    console.error('[Helius] Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Setup webhook for transaction notifications (server-side only)
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
    console.error('[Helius] Error creating webhook:', error);
    throw error;
  }
}

/**
 * Get NFTs owned by a wallet
 */
export async function getNFTs(walletAddress: string) {
  try {
    const response = await axios.get(
      `${HELIUS_API_URL}/addresses/${walletAddress}/nfts`,
      {
        params: {
          'api-key': HELIUS_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('[Helius] Error fetching NFTs:', error);
    throw error;
  }
}

/**
 * Get priority fee estimate for a transaction
 */
export async function getPriorityFeeEstimate(): Promise<number> {
  try {
    const response = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'helius-priority-fee',
        method: 'getPriorityFeeEstimate',
        params: [
          {
            options: {
              priorityLevel: 'Medium',
            },
          },
        ],
      }
    );
    return response.data.result?.priorityFeeEstimate || 0;
  } catch (error) {
    console.error('[Helius] Error fetching priority fee:', error);
    return 0;
  }
}
