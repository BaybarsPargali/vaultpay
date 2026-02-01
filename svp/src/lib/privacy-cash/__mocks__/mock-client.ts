// src/lib/privacy-cash/__mocks__/mock-client.ts
// Mock Privacy Cash Client for Testing and Development

import type {
  PrivacyCashConfig,
  DepositResult,
  WithdrawResult,
  PrivateTransferResult,
  PoolStats,
  EncryptedPayload,
  BatchEncryptedPayload,
} from '../types';

/**
 * Mock Privacy Cash Client
 * Used for testing and development without real Arcium MPC
 */
export class MockPrivacyCashClient {
  /**
   * Mock encrypt amount - generates fake ciphertext
   */
  async encryptAmount(amount: number): Promise<EncryptedPayload> {
    const mockCiphertext = new Uint8Array(32);
    crypto.getRandomValues(mockCiphertext);

    const mockNonce = new Uint8Array(16);
    crypto.getRandomValues(mockNonce);

    const mockPublicKey = new Uint8Array(32);
    crypto.getRandomValues(mockPublicKey);

    console.log('[MockPrivacyCash] Amount mock-encrypted:', amount);

    return {
      ciphertext: mockCiphertext,
      publicKey: mockPublicKey,
      nonce: Buffer.from(mockNonce),
    };
  }

  /**
   * Mock private transfer
   */
  async privateTransfer(
    senderPublicKey: unknown,
    recipientAddress: string,
    amount: number
  ): Promise<PrivateTransferResult> {
    console.log(`[MockPrivacyCash] Mock private transfer of ${amount} SOL`);

    const encryptedPayload = await this.encryptAmount(amount);
    const txSignature = this.generateMockSignature();

    return {
      depositSignature: txSignature,
      withdrawSignature: txSignature,
      stealthAddress: recipientAddress,
      amount,
      success: true,
      encryptedPayload,
    };
  }

  /**
   * Mock batch encrypt payments
   */
  async batchEncryptPayments(
    payments: Array<{ amount: number; recipient: string }>
  ): Promise<BatchEncryptedPayload> {
    console.log(`[MockPrivacyCash] Mock batch encrypting ${payments.length} payments`);

    const mockPublicKey = new Uint8Array(32);
    crypto.getRandomValues(mockPublicKey);

    const encryptedPayments = payments.map((payment) => {
      const mockCiphertext = new Uint8Array(32);
      crypto.getRandomValues(mockCiphertext);

      const mockNonce = new Uint8Array(16);
      crypto.getRandomValues(mockNonce);

      return {
        recipient: payment.recipient,
        ciphertext: mockCiphertext,
        nonce: Buffer.from(mockNonce),
      };
    });

    return {
      payments: encryptedPayments,
      publicKey: mockPublicKey,
      totalPayments: payments.length,
    };
  }

  /**
   * Mock deposit
   */
  async deposit(walletPublicKey: unknown, amount: number): Promise<DepositResult> {
    console.log(`[MockPrivacyCash] Mock deposit of ${amount} SOL`);

    const encryptedPayload = await this.encryptAmount(amount);

    return {
      signature: this.generateMockSignature(),
      commitment: Buffer.from(encryptedPayload.ciphertext).toString('hex'),
      nullifierHash: Buffer.from(encryptedPayload.nonce).toString('hex'),
      amount,
      encryptedPayload,
    };
  }

  /**
   * Mock withdraw
   */
  async withdraw(
    commitment: string,
    nullifierHash: string,
    recipientAddress: string,
    amount: number
  ): Promise<WithdrawResult> {
    console.log(`[MockPrivacyCash] Mock withdraw of ${amount} SOL`);

    return {
      signature: this.generateMockSignature(),
      recipient: recipientAddress,
      amount,
    };
  }

  /**
   * Mock pool stats
   */
  async getPoolStats(): Promise<PoolStats> {
    return {
      totalDeposits: 1000,
      totalWithdrawals: 500,
      currentAnonymitySet: 50,
    };
  }

  /**
   * Generate mock signature
   */
  private generateMockSignature(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(64));
    return 'mock_' + Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '').slice(0, 44);
  }
}

// Export singleton instance
export const mockPrivacyCash = new MockPrivacyCashClient();
