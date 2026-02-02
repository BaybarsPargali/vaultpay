// src/lib/range/types.ts
// Range Compliance API Type Definitions

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ScreeningResult {
  address: string;
  approved: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
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
  data: unknown;
  viewerPublicKey: string;
  disclosureLevel: 'minimal' | 'partial' | 'audit' | 'full';
}

export interface SelectiveDisclosureResult {
  disclosedData: unknown;
  proof: string;
  verificationKey: string;
}

export interface RangeConfig {
  apiKey?: string;
  apiUrl?: string;
}
