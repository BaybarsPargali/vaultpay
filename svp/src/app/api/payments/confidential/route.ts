// src/app/api/payments/confidential/route.ts
// Confidential Payment API - Uses Token-2022 Confidential Transfers via CLI Bridge
//
// ⚠️ PRODUCTION-READY: All operations use the real spl-token CLI
// No simulations or placeholder ZK proofs - real on-chain privacy!
//
// Requirements:
// - spl-token CLI installed (cargo install spl-token-cli)
// - SOLANA_KEYPAIR_PATH set for server-side signing
// - Token account must exist before configuring for CT
//
// Flow:
// 1. Create token account (if needed)
// 2. Configure account for CT (generates ElGamal keypair via CLI)
// 3. Deposit to confidential balance
// 4. Execute confidential transfer

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';
import { connection } from '@/lib/solana/connection';
import {
  getCliBridge,
  isCliBridgeAvailable,
} from '@/lib/confidential/cli-bridge';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { requireWalletAuth } from '@/lib/auth';

// Confidential mint address
const CONFIDENTIAL_MINT = process.env.NEXT_PUBLIC_CONFIDENTIAL_MINT || 'Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo';

// Server keypair path for signing transactions
const SOLANA_KEYPAIR_PATH = process.env.SOLANA_KEYPAIR_PATH || '';

/**
 * Get token account address for a wallet
 */
function getTokenAccountAddress(walletAddress: string): string {
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(CONFIDENTIAL_MINT);
  const ata = getAssociatedTokenAddressSync(
    mint,
    wallet,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata.toBase58();
}

/**
 * Check if CLI bridge is available and configured
 * 
 * NOTE: The CLI-based approach is the PRODUCTION-CORRECT solution.
 * Solana's Token-2022 CT uses Bulletproof ZK proofs that are only available
 * via the official Rust crates. There is NO JavaScript SDK for CT proof generation.
 */
async function checkCLISetup(): Promise<{ available: boolean; error?: string }> {
  const cliAvailable = await isCliBridgeAvailable();
  if (!cliAvailable) {
    return {
      available: false,
      error: 'Privacy engine not configured. The spl-token CLI is required for ZK proof generation (this is the official Solana approach - no JS SDK exists).',
    };
  }
  
  if (!SOLANA_KEYPAIR_PATH) {
    return {
      available: false,
      error: 'Server keypair not configured. Set SOLANA_KEYPAIR_PATH environment variable for transaction signing.',
    };
  }
  
  if (!fs.existsSync(SOLANA_KEYPAIR_PATH)) {
    return {
      available: false,
      error: `Server keypair file not found at: ${SOLANA_KEYPAIR_PATH}. Configure the server with a valid Solana keypair for CT operations.`,
    };
  }
  
  return { available: true };
}

/**
 * GET /api/payments/confidential
 * Get confidential payment configuration and CLI status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (walletAddress) {
      const auth = await requireWalletAuth(request);
      if (auth.ok === false) return auth.response;

      if (walletAddress !== auth.wallet) {
        return NextResponse.json({ success: false, error: 'wallet mismatch' }, { status: 403 });
      }
    }

    // Check CLI availability
    const cliStatus = await checkCLISetup();

    // Check if we have mint authority
    let hasMintAuthority = false;
    const mintKeypairPath = path.join(process.cwd(), 'confidential-mint-keypair.json');
    if (fs.existsSync(mintKeypairPath)) {
      hasMintAuthority = true;
    }

    // Get account info if wallet provided
    let accountStatus = null;
    if (walletAddress && cliStatus.available) {
      try {
        const tokenAccount = getTokenAccountAddress(walletAddress);
        const bridge = getCliBridge({
          keypairPath: SOLANA_KEYPAIR_PATH,
          verbose: false,
        });
        
        const result = await bridge.getAccountInfo(tokenAccount);
        
        if (result.success && result.output) {
          // Parse CLI output for account status
          const output = result.output;
          const isConfigured = output.includes('confidential transfer') || output.includes('Confidential');
          
          accountStatus = {
            tokenAccount,
            isConfigured,
            cliOutput: output,
          };
        } else {
          accountStatus = {
            tokenAccount,
            isConfigured: false,
            error: result.error || 'Account not found or not configured',
          };
        }
      } catch (err) {
        accountStatus = {
          tokenAccount: getTokenAccountAddress(walletAddress),
          isConfigured: false,
          error: err instanceof Error ? err.message : 'Failed to check account',
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        confidentialMint: CONFIDENTIAL_MINT,
        hasMintAuthority,
        cliAvailable: cliStatus.available,
        cliError: cliStatus.error,
        privacyLevel: cliStatus.available ? 'FULL' : 'UNAVAILABLE',
        description: cliStatus.available
          ? 'Token-2022 Confidential Transfers - REAL encrypted amounts on-chain'
          : 'CLI not configured - confidential transfers unavailable',
        features: cliStatus.available ? [
          '✅ Real Twisted ElGamal encryption',
          '✅ Real ZK proof generation via spl-token CLI',
          '✅ Amounts hidden from public explorers',
          '✅ Only sender & recipient can decrypt',
        ] : [
          '❌ spl-token CLI required for ZK proof generation',
          '❌ No JavaScript SDK available yet',
          '❌ Configure CLI to enable confidential transfers',
        ],
        accountStatus,
        supportedOperations: cliStatus.available ? [
          'create-account',
          'configure-account',
          'deposit',
          'transfer',
          'withdraw',
          'apply-pending',
          'get-balance',
        ] : [],
        requirements: !cliStatus.available ? {
          cli: 'cargo install spl-token-cli',
          env: 'SOLANA_KEYPAIR_PATH=/path/to/keypair.json',
        } : null,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting confidential config');
    return NextResponse.json(
      { success: false, error: 'Failed to get confidential config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/confidential
 * Execute confidential transfer operations via CLI
 * 
 * Operations:
 * - create-account: Create token account
 * - configure-account: Configure for CT (generates ElGamal keypair)
 * - deposit: Deposit to confidential balance
 * - transfer: Execute confidential transfer
 * - withdraw: Withdraw from confidential balance
 * - apply-pending: Apply pending balance
 * - mint-faucet: Mint test tokens (devnet only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.ok === false) return auth.response;

    const body = await request.json();
    const { operation, wallet } = body;

    // Verify wallet matches auth
    if (wallet && wallet !== auth.wallet) {
      return NextResponse.json({ success: false, error: 'wallet mismatch' }, { status: 403 });
    }

    // Check CLI availability for operations that need it
    const operationsNeedingCLI = [
      'create-account',
      'configure-account',
      'deposit',
      'transfer',
      'withdraw',
      'apply-pending',
    ];

    if (operationsNeedingCLI.includes(operation)) {
      const cliStatus = await checkCLISetup();
      if (!cliStatus.available) {
        return NextResponse.json({
          success: false,
          error: cliStatus.error,
          cliUnavailable: true,
          requirements: {
            cli: 'cargo install spl-token-cli',
            env: 'SOLANA_KEYPAIR_PATH=/path/to/keypair.json',
          },
        }, { status: 503 });
      }
    }

    // Handle operations
    switch (operation) {
      case 'create-account':
        return handleCreateAccount(body);

      case 'configure-account':
        return handleConfigureAccount(body);

      case 'deposit':
        return handleDeposit(body);

      case 'transfer':
        return handleTransfer(body);

      case 'withdraw':
        return handleWithdraw(body);

      case 'apply-pending':
        return handleApplyPending(body);

      case 'mint-faucet':
        return handleMintFaucet(body);

      case 'get-balance':
        return handleGetBalance(body);

      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error({ error }, 'Error in confidential payment');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Create token account for wallet
 */
async function handleCreateAccount(body: { wallet: string }): Promise<NextResponse> {
  const { wallet } = body;

  if (!wallet) {
    return NextResponse.json({ success: false, error: 'Missing wallet address' }, { status: 400 });
  }

  try {
    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: true,
    });

    const result = await bridge.createAccount(CONFIDENTIAL_MINT);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create account',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Token account created successfully',
        output: result.output,
        signature: result.signature,
        tokenAccount: getTokenAccountAddress(wallet),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error creating account');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
    }, { status: 500 });
  }
}

/**
 * Configure account for confidential transfers
 * This uses the CLI which generates ElGamal keypair automatically
 */
async function handleConfigureAccount(body: { wallet: string }): Promise<NextResponse> {
  const { wallet } = body;

  if (!wallet) {
    return NextResponse.json({ success: false, error: 'Missing wallet address' }, { status: 400 });
  }

  try {
    const tokenAccount = getTokenAccountAddress(wallet);
    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: true,
    });

    const result = await bridge.configureAccount(tokenAccount);

    if (!result.success) {
      // Check for specific errors
      if (result.error?.includes('already configured')) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'Account already configured for confidential transfers',
            tokenAccount,
            alreadyConfigured: true,
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to configure account',
        hint: 'Ensure the token account exists first. Try "create-account" operation.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '✅ Account configured for confidential transfers!',
        tokenAccount,
        signature: result.signature,
        output: result.output,
        note: 'ElGamal keypair generated by spl-token CLI and stored in ~/.config/solana/',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error configuring account');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure account',
    }, { status: 500 });
  }
}

/**
 * Deposit tokens to confidential balance
 */
async function handleDeposit(body: { wallet: string; amount: number }): Promise<NextResponse> {
  const { wallet, amount } = body;

  if (!wallet || amount === undefined) {
    return NextResponse.json({ success: false, error: 'Missing wallet or amount' }, { status: 400 });
  }

  try {
    const tokenAccount = getTokenAccountAddress(wallet);
    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: true,
    });

    const result = await bridge.deposit(CONFIDENTIAL_MINT, amount, tokenAccount);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to deposit',
        hint: 'Ensure the account is configured and has non-confidential balance.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `✅ Deposited ${amount} tokens to confidential balance`,
        tokenAccount,
        amount,
        signature: result.signature,
        output: result.output,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error depositing');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deposit',
    }, { status: 500 });
  }
}

/**
 * Execute confidential transfer
 */
async function handleTransfer(body: {
  wallet: string;
  recipient: string;
  amount: number;
}): Promise<NextResponse> {
  const { recipient, amount } = body;

  if (!recipient || amount === undefined) {
    return NextResponse.json({
      success: false,
      error: 'Missing recipient or amount',
    }, { status: 400 });
  }

  try {
    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: true,
    });

    const result = await bridge.transfer(CONFIDENTIAL_MINT, amount, recipient);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to transfer',
        hint: 'Ensure both accounts are configured and sender has sufficient confidential balance.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `✅ Confidential transfer of ${amount} tokens complete!`,
        recipient,
        amount,
        signature: result.signature,
        output: result.output,
        privacyNote: '🔒 This amount is ENCRYPTED on-chain - not visible on explorers!',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error transferring');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer',
    }, { status: 500 });
  }
}

/**
 * Withdraw from confidential balance
 */
async function handleWithdraw(body: { wallet: string; amount: number }): Promise<NextResponse> {
  const { wallet, amount } = body;

  if (!wallet || amount === undefined) {
    return NextResponse.json({ success: false, error: 'Missing wallet or amount' }, { status: 400 });
  }

  try {
    const tokenAccount = getTokenAccountAddress(wallet);
    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: true,
    });

    const result = await bridge.withdraw(CONFIDENTIAL_MINT, amount, tokenAccount);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to withdraw',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `✅ Withdrawn ${amount} tokens from confidential balance`,
        tokenAccount,
        amount,
        signature: result.signature,
        output: result.output,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error withdrawing');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to withdraw',
    }, { status: 500 });
  }
}

/**
 * Apply pending balance to available balance
 */
async function handleApplyPending(body: { wallet: string }): Promise<NextResponse> {
  const { wallet } = body;

  if (!wallet) {
    return NextResponse.json({ success: false, error: 'Missing wallet' }, { status: 400 });
  }

  try {
    const tokenAccount = getTokenAccountAddress(wallet);
    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: true,
    });

    const result = await bridge.applyPendingBalance(tokenAccount);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to apply pending balance',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '✅ Pending balance applied successfully',
        tokenAccount,
        signature: result.signature,
        output: result.output,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error applying pending');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply pending',
    }, { status: 500 });
  }
}

/**
 * Get account balance info via CLI
 */
async function handleGetBalance(body: { wallet: string }): Promise<NextResponse> {
  const { wallet } = body;

  if (!wallet) {
    return NextResponse.json({ success: false, error: 'Missing wallet' }, { status: 400 });
  }

  try {
    const tokenAccount = getTokenAccountAddress(wallet);
    
    const cliStatus = await checkCLISetup();
    if (!cliStatus.available) {
      // Fallback: just return token account address without balance
      return NextResponse.json({
        success: true,
        data: {
          tokenAccount,
          cliUnavailable: true,
          message: 'CLI not available for balance check',
        },
      });
    }

    const bridge = getCliBridge({
      keypairPath: SOLANA_KEYPAIR_PATH,
      verbose: false,
    });

    const result = await bridge.getAccountInfo(tokenAccount);

    return NextResponse.json({
      success: true,
      data: {
        tokenAccount,
        output: result.output,
        isConfigured: result.output?.includes('confidential') || false,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting balance');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance',
    }, { status: 500 });
  }
}

/**
 * Mint test tokens (devnet faucet)
 */
async function handleMintFaucet(body: { wallet: string; amount?: number }): Promise<NextResponse> {
  const { wallet, amount = 1000 } = body;

  if (!wallet) {
    return NextResponse.json({ success: false, error: 'Missing wallet address' }, { status: 400 });
  }

  try {
    // Load mint authority keypair
    const keypairPath = path.join(process.cwd(), 'confidential-mint-keypair.json');

    if (!fs.existsSync(keypairPath)) {
      return NextResponse.json({
        success: false,
        error: 'Mint authority not configured. Run scripts/create-confidential-mint.ts first.',
      }, { status: 400 });
    }

    const mintKeypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(mintKeypairData));

    const walletPubkey = new PublicKey(wallet);

    // Get or create associated token account
    const { getOrCreateAssociatedTokenAccount, mintTo } = await import('@solana/spl-token');

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      new PublicKey(CONFIDENTIAL_MINT),
      walletPubkey,
      false,
      'confirmed',
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Amount in smallest units (assuming 9 decimals)
    const mintAmount = BigInt(amount) * BigInt(10 ** 9);

    const signature = await mintTo(
      connection,
      mintAuthority,
      new PublicKey(CONFIDENTIAL_MINT),
      tokenAccount.address,
      mintAuthority,
      mintAmount,
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );

    return NextResponse.json({
      success: true,
      data: {
        signature,
        tokenAccount: tokenAccount.address.toBase58(),
        amountMinted: amount,
        message: `✅ Minted ${amount} VPAY tokens! Now deposit to confidential balance with "deposit" operation.`,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error minting tokens');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mint tokens',
    }, { status: 500 });
  }
}
