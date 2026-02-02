// src/lib/range/__mocks__/mock-client.ts
// Mock Range Client for Testing and Development

import type {
  ScreeningResult,
  SelectiveDisclosureRequest,
  SelectiveDisclosureResult,
  RiskLevel,
} from '../types';

/**
 * Mock Range Client
 * Used for testing and development without real Range API
 */
export class MockRangeClient {
  /**
   * Mock screen address - always returns approved for testing
   */
  async screenAddress(address: string): Promise<ScreeningResult> {
    console.log(`[MockRange] Screening address: ${address}`);

    // Generate deterministic but varied risk score based on address
    const hashCode = address.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const riskScore = Math.abs(hashCode % 30) / 100; // 0.00 - 0.29 (always low risk)

    return {
      address,
      approved: true,
      riskScore,
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

  /**
   * Mock batch screen - screens multiple addresses
   */
  async batchScreen(addresses: string[]): Promise<Map<string, ScreeningResult>> {
    const results = new Map<string, ScreeningResult>();

    for (const address of addresses) {
      const result = await this.screenAddress(address);
      results.set(address, result);
    }

    return results;
  }

  /**
   * Mock selective disclosure
   */
  async createSelectiveDisclosure(
    request: SelectiveDisclosureRequest
  ): Promise<SelectiveDisclosureResult> {
    console.log('[MockRange] Creating mock selective disclosure');

    let disclosedData = request.data;

    if (request.disclosureLevel === 'minimal') {
      disclosedData = { verified: true };
    } else if (request.disclosureLevel === 'partial') {
      disclosedData = {
        verified: true,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      disclosedData,
      proof: `mock_proof_${Date.now()}`,
      verificationKey: `mock_key_${Date.now()}`,
    };
  }

  /**
   * Mock verify selective disclosure
   */
  async verifySelectiveDisclosure(
    proof: string,
    verificationKey: string
  ): Promise<boolean> {
    console.log('[MockRange] Verifying mock selective disclosure');
    return true;
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score: number): RiskLevel {
    if (score < 0.3) return 'low';
    if (score < 0.5) return 'medium';
    if (score < 0.7) return 'high';
    return 'critical';
  }

  /**
   * Check if address is approved
   */
  isApproved(result: ScreeningResult, threshold: number = 0.7): boolean {
    return result.riskScore < threshold && !result.details.sanctionsMatch;
  }
}

// Export singleton instance
export const mockRangeClient = new MockRangeClient();
