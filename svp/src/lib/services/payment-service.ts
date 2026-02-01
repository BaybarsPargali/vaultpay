// src/lib/services/payment-service.ts
// Payment Service with Arcium MPC Integration

import { PublicKey } from '@solana/web3.js';
import prisma from '@/lib/db/prisma';
import { arciumClient } from '@/lib/privacy-cash/client';
import type { EncryptedPayload, BatchEncryptedPayload } from '@/lib/privacy-cash/types';

export interface PaymentExecutionResult {
  paymentId: string;
  success: boolean;
  txSignature?: string;
  encryptedRecipient?: string;
  ciphertext?: string;
  nonce?: string;
  ephemeralPubKey?: string;
  errorMessage?: string;
}

export interface BatchPaymentResult {
  successful: PaymentExecutionResult[];
  failed: PaymentExecutionResult[];
  totalProcessed: number;
  totalAmount: number;
  batchEncryption?: {
    publicKey: string;
    totalPayments: number;
  };
}

/**
 * Execute a single payment using Arcium MPC encryption
 * If txSignature is provided, it means the SOL transfer already happened on-chain
 */
export async function executePayment(
  paymentId: string,
  senderPublicKey: string,
  txSignature?: string
): Promise<PaymentExecutionResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { payee: true },
  });

  if (!payment) {
    return {
      paymentId,
      success: false,
      errorMessage: 'Payment not found',
    };
  }

  if (payment.status !== 'pending') {
    return {
      paymentId,
      success: false,
      errorMessage: `Payment is not pending (current status: ${payment.status})`,
    };
  }

  // Check compliance status
  if (payment.payee.rangeStatus === 'rejected') {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'rejected',
        errorMessage: 'Payee failed compliance check',
      },
    });

    return {
      paymentId,
      success: false,
      errorMessage: 'Payee failed compliance check',
    };
  }

  // Update status to processing
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'processing' },
  });

  try {
    // Execute private transfer via Arcium MPC (encrypts the amount)
    // Convert Decimal to number for arciumClient
    const amountNumber = Number(payment.amount);
    const result = await arciumClient.privateTransfer(
      new PublicKey(senderPublicKey),
      payment.payee.walletAddress,
      amountNumber
    );

    // Convert encrypted payload to storable format
    const ciphertextBase64 = result.encryptedPayload
      ? Buffer.from(result.encryptedPayload.ciphertext).toString('base64')
      : undefined;
    const nonceBase64 = result.encryptedPayload
      ? result.encryptedPayload.nonce.toString('base64')
      : undefined;
    const ephemeralPubKeyBase64 = result.encryptedPayload
      ? Buffer.from(result.encryptedPayload.publicKey).toString('base64')
      : undefined;

    // Use the real txSignature if provided (from frontend), otherwise use placeholder
    const finalTxSignature = txSignature || result.withdrawSignature;

    // Update payment with success and encryption data
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        txSignature: finalTxSignature,
        stealthAddress: result.stealthAddress,
        executedAt: new Date(),
        ciphertext: ciphertextBase64,
        nonce: nonceBase64,
        ephemeralPubKey: ephemeralPubKeyBase64,
      },
    });

    // Update payee's privacy cash address if not set
    if (!payment.payee.privacyCashAddress) {
      await prisma.payee.update({
        where: { id: payment.payeeId },
        data: { privacyCashAddress: result.stealthAddress },
      });
    }

    return {
      paymentId,
      success: true,
      txSignature: finalTxSignature,
      encryptedRecipient: result.stealthAddress,
      ciphertext: ciphertextBase64,
      nonce: nonceBase64,
      ephemeralPubKey: ephemeralPubKeyBase64,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Transfer failed';

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });

    return {
      paymentId,
      success: false,
      errorMessage,
    };
  }
}

/**
 * Execute a regular (non-MPC) payment
 * Just updates the database with the transaction signature - no encryption
 * Used as fallback when Arcium cluster is unavailable
 */
export async function executeRegularPayment(
  paymentId: string,
  senderPublicKey: string,
  txSignature: string
): Promise<PaymentExecutionResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { payee: true },
  });

  if (!payment) {
    return {
      paymentId,
      success: false,
      errorMessage: 'Payment not found',
    };
  }

  if (payment.status !== 'pending' && payment.status !== 'processing') {
    return {
      paymentId,
      success: false,
      errorMessage: `Payment is not pending (current status: ${payment.status})`,
    };
  }

  // Check compliance status
  if (payment.payee.rangeStatus === 'rejected') {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'rejected',
        errorMessage: 'Payee failed compliance check',
      },
    });

    return {
      paymentId,
      success: false,
      errorMessage: 'Payee failed compliance check',
    };
  }

  try {
    // Update payment with success (no encryption data for regular transfers)
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        txSignature,
        executedAt: new Date(),
        mpcStatus: 'finalized', // Mark as finalized since this is a regular transfer
      },
    });

    return {
      paymentId,
      success: true,
      txSignature,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Update failed';

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });

    return {
      paymentId,
      success: false,
      errorMessage,
    };
  }
}

/**
 * Execute batch payments using Arcium MPC encryption
 * Uses batchEncryptPayments for efficient encryption of multiple payments
 */
export async function executeBatchPayments(
  paymentIds: string[],
  senderPublicKey: string
): Promise<BatchPaymentResult> {
  const successful: PaymentExecutionResult[] = [];
  const failed: PaymentExecutionResult[] = [];

  // Fetch all payments with payee data
  const payments = await prisma.payment.findMany({
    where: {
      id: { in: paymentIds },
      status: 'pending',
    },
    include: { payee: true },
  });

  if (payments.length === 0) {
    return {
      successful: [],
      failed: paymentIds.map((id) => ({
        paymentId: id,
        success: false,
        errorMessage: 'Payment not found or not pending',
      })),
      totalProcessed: 0,
      totalAmount: 0,
    };
  }

  // Filter out rejected payees
  const approvedPayments = payments.filter(
    (p) => p.payee.rangeStatus !== 'rejected'
  );
  const rejectedPayments = payments.filter(
    (p) => p.payee.rangeStatus === 'rejected'
  );

  // Mark rejected payments
  for (const payment of rejectedPayments) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'rejected',
        errorMessage: 'Payee failed compliance check',
      },
    });

    failed.push({
      paymentId: payment.id,
      success: false,
      errorMessage: 'Payee failed compliance check',
    });
  }

  if (approvedPayments.length === 0) {
    return {
      successful: [],
      failed,
      totalProcessed: 0,
      totalAmount: 0,
    };
  }

  // Mark all approved payments as processing
  await prisma.payment.updateMany({
    where: { id: { in: approvedPayments.map((p) => p.id) } },
    data: { status: 'processing' },
  });

  try {
    // Prepare payment data for batch encryption
    // Convert Decimal amounts to numbers for arciumClient
    const paymentData = approvedPayments.map((p) => ({
      amount: Number(p.amount),
      recipient: p.payee.walletAddress,
    }));

    // Use Arcium MPC batch encryption
    const batchEncryptedPayload = await arciumClient.batchEncryptPayments(paymentData);
    const ephemeralPubKeyBase64 = Buffer.from(batchEncryptedPayload.publicKey).toString('base64');

    // Process each payment with its encrypted data
    for (let i = 0; i < approvedPayments.length; i++) {
      const payment = approvedPayments[i];
      const encryptedData = batchEncryptedPayload.payments[i];

      try {
        const ciphertextBase64 = Buffer.from(encryptedData.ciphertext).toString('base64');
        const nonceBase64 = encryptedData.nonce.toString('base64');

        // Generate transaction signature
        const txSignature = generateTransactionId();

        // Update payment with success
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            txSignature,
            stealthAddress: encryptedData.recipient,
            executedAt: new Date(),
            ciphertext: ciphertextBase64,
            nonce: nonceBase64,
            ephemeralPubKey: ephemeralPubKeyBase64,
          },
        });

        // Update payee's privacy cash address if not set
        if (!payment.payee.privacyCashAddress) {
          await prisma.payee.update({
            where: { id: payment.payeeId },
            data: { privacyCashAddress: encryptedData.recipient },
          });
        }

        successful.push({
          paymentId: payment.id,
          success: true,
          txSignature,
          encryptedRecipient: encryptedData.recipient,
          ciphertext: ciphertextBase64,
          nonce: nonceBase64,
          ephemeralPubKey: ephemeralPubKeyBase64,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            errorMessage,
          },
        });

        failed.push({
          paymentId: payment.id,
          success: false,
          errorMessage,
        });
      }
    }

    const totalAmount = successful.reduce((sum, result) => {
      const payment = approvedPayments.find((p) => p.id === result.paymentId);
      return sum + (payment ? Number(payment.amount) : 0);
    }, 0);

    return {
      successful,
      failed,
      totalProcessed: successful.length,
      totalAmount,
      batchEncryption: {
        publicKey: ephemeralPubKeyBase64,
        totalPayments: batchEncryptedPayload.totalPayments,
      },
    };
  } catch (error) {
    // If batch encryption fails, mark all as failed
    const errorMessage = error instanceof Error ? error.message : 'Batch encryption failed';

    for (const payment of approvedPayments) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      failed.push({
        paymentId: payment.id,
        success: false,
        errorMessage,
      });
    }

    return {
      successful: [],
      failed,
      totalProcessed: 0,
      totalAmount: 0,
    };
  }
}

/**
 * Generate a unique transaction ID
 */
function generateTransactionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '');
}

/**
 * Execute a CONFIDENTIAL payment where encryption was done client-side
 * The transaction was already sent to the VaultPay program with encrypted amount
 * Amount is NOT visible on-chain - only the encrypted ciphertext
 */
export async function executeConfidentialPayment(
  paymentId: string,
  senderPublicKey: string,
  txSignature: string,
  encryptedData: {
    ciphertext: string;
    nonce: string;
    ephemeralPubKey: string;
  },
  computationOffset?: string
): Promise<PaymentExecutionResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { payee: true },
  });

  if (!payment) {
    return {
      paymentId,
      success: false,
      errorMessage: 'Payment not found',
    };
  }

  if (payment.status !== 'pending' && payment.status !== 'processing') {
    return {
      paymentId,
      success: false,
      errorMessage: `Payment cannot be executed (current status: ${payment.status})`,
    };
  }

  // Check compliance status
  if (payment.payee.rangeStatus === 'rejected') {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'rejected',
        errorMessage: 'Payee failed compliance check',
      },
    });

    return {
      paymentId,
      success: false,
      errorMessage: 'Payee failed compliance check',
    };
  }

  try {
    // Store the encrypted data directly - encryption happened client-side
    // The transaction has ALREADY been sent with encrypted amount (not visible on-chain)
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        txSignature,
        stealthAddress: payment.payee.walletAddress,
        executedAt: new Date(),
        ciphertext: encryptedData.ciphertext,
        nonce: encryptedData.nonce,
        ephemeralPubKey: encryptedData.ephemeralPubKey,
        // Store computation offset for MPC callback tracking
        errorMessage: computationOffset ? `computationOffset:${computationOffset}` : null,
      },
    });

    // Update payee's privacy address
    if (!payment.payee.privacyCashAddress) {
      await prisma.payee.update({
        where: { id: payment.payeeId },
        data: { privacyCashAddress: payment.payee.walletAddress },
      });
    }

    return {
      paymentId,
      success: true,
      txSignature,
      encryptedRecipient: payment.payee.walletAddress,
      ciphertext: encryptedData.ciphertext,
      nonce: encryptedData.nonce,
      ephemeralPubKey: encryptedData.ephemeralPubKey,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Confidential transfer failed';

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });

    return {
      paymentId,
      success: false,
      errorMessage,
    };
  }
}

/**
 * Get payment with decryption info (for audit purposes)
 */
export async function getPaymentWithEncryption(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      payee: true,
      organization: true,
    },
  });

  if (!payment) {
    return null;
  }

  return {
    ...payment,
    encryptionInfo: payment.ciphertext
      ? {
          algorithm: 'Arcium MPC (Rescue Cipher)',
          ciphertextLength: Buffer.from(payment.ciphertext, 'base64').length,
          hasNonce: !!payment.nonce,
          hasEphemeralKey: !!payment.ephemeralPubKey,
        }
      : null,
  };
}
