// src/types/index.ts
// VaultPay TypeScript Type Definitions

// =============================================================================
// Organization Types
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  adminWallet: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  // Token-2022 Confidential Treasury
  treasuryMint?: string | null;
  treasuryAccount?: string | null;
  elGamalPubKey?: string | null;
  // Squads Multi-sig
  multisigAddress?: string | null;
  multisigThreshold?: number | null;
  multisigMembers?: string | null; // JSON array
  // Auditor Configuration
  auditorPubkey?: string | null;       // x25519 public key (base64)
  auditorName?: string | null;         // Human-readable auditor name
  auditorConfiguredAt?: Date | string | null;
}

export interface CreateOrganizationInput {
  name: string;
  adminWallet: string;
}

// =============================================================================
// Payee Types
// =============================================================================

export type RangeStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export interface Payee {
  id: string;
  orgId: string;
  name: string;
  email: string;
  walletAddress: string;
  arciumAddress?: string | null;
  rangeStatus: RangeStatus;
  rangeRiskScore?: number | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CreatePayeeInput {
  orgId: string;
  name: string;
  email: string;
  walletAddress: string;
}

export interface UpdatePayeeInput {
  name?: string;
  email?: string;
  walletAddress?: string;
  rangeStatus?: RangeStatus;
  rangeRiskScore?: number;
  arciumAddress?: string;
}

// =============================================================================
// Payment Types
// =============================================================================

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
export type MPCStatus = 'pending' | 'queued' | 'processing' | 'finalized' | 'failed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed';
export type RecurringSchedule = 'weekly' | 'biweekly' | 'monthly';

export interface Payment {
  id: string;
  orgId: string;
  payeeId: string;
  amount: number;
  token: string;
  status: PaymentStatus;
  txSignature?: string | null;
  encryptedRecipient?: string | null;
  errorMessage?: string | null;
  createdAt: Date | string;
  executedAt?: Date | string | null;
  payee?: Payee;
  // Arcium MPC Encryption Fields
  ciphertext?: string | null;
  nonce?: string | null;
  ephemeralPubKey?: string | null;
  // MPC Computation Tracking
  computationOffset?: string | null;
  mpcStatus?: MPCStatus | null;
  mpcTxSignature?: string | null;
  mpcFinalizedAt?: Date | string | null;
  // Multi-sig Approval
  requiresApproval?: boolean;
  approvalProposalId?: string | null;
  approvalStatus?: ApprovalStatus | null;
  approvedBy?: string | null; // JSON array
  // Recurring Payment
  isRecurring?: boolean;
  recurringSchedule?: RecurringSchedule | null;
  nextPaymentDate?: Date | string | null;
  parentPaymentId?: string | null;
  // Auditor Sealing
  auditorSealedOutput?: string | null;  // Base64-encoded sealed MPC result
  auditorSealedAt?: Date | string | null;
}

export interface CreatePaymentInput {
  orgId: string;
  payeeId: string;
  amount: number;
  token?: string;
}

export interface BatchPaymentInput {
  orgId: string;
  payments: {
    payeeId: string;
    amount: number;
  }[];
  token?: string;
}

// =============================================================================
// Arcium MPC Types
// =============================================================================

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
  encryptedRecipient: string;
  amount: number;
  success: boolean;
}

// =============================================================================
// Range Compliance Types
// =============================================================================

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

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// Dashboard Stats Types
// =============================================================================

export interface DashboardStats {
  treasuryBalance: number;
  totalPayees: number;
  monthlyPaidOut: number;
  pendingPayments: number;
  approvedPayees: number;
  flaggedPayees: number;
}

// =============================================================================
// Audit Types
// =============================================================================

export interface AuditEntry {
  id: string;
  paymentId: string;
  amount: number;
  token: string;
  recipientMasked: string;
  status: PaymentStatus;
  txSignature?: string | null;
  createdAt: Date | string;
  executedAt?: Date | string | null;
}

export interface AuditReport {
  orgId: string;
  generatedAt: Date | string;
  period: {
    start: Date | string;
    end: Date | string;
  };
  summary: {
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
  };
  entries: AuditEntry[];
}

// =============================================================================
// Recurring Payment Types
// =============================================================================

export interface RecurringPaymentTemplate {
  id: string;
  orgId: string;
  payeeId: string;
  amount: number;
  token: string;
  schedule: RecurringSchedule;
  nextRunDate: Date | string;
  lastRunDate?: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  payee?: Payee;
}

export interface CreateRecurringPaymentInput {
  orgId: string;
  payeeId: string;
  amount: number;
  token?: string;
  schedule: RecurringSchedule;
  startDate?: Date | string;
}

// =============================================================================
// Treasury Types
// =============================================================================

export interface TreasuryInfo {
  mint: string;
  account: string;
  balance: number; // Decrypted balance (only for admin)
  isConfidential: boolean;
  lastUpdated: Date | string;
}

export interface TreasuryDepositInput {
  amount: number;
  token: string;
}

// =============================================================================
// Multi-sig Types
// =============================================================================

export interface MultisigConfig {
  address: string;
  threshold: number;
  members: string[];
}

export interface ApprovalProposal {
  id: string;
  paymentId: string;
  status: ApprovalStatus;
  approvers: string[];
  requiredApprovals: number;
  createdAt: Date | string;
  expiresAt: Date | string;
}

// =============================================================================
// Compliance Attestation Types
// =============================================================================

export interface ComplianceAttestation {
  id: string;
  wallet: string;
  status: RangeStatus;
  riskScore?: number | null;
  screenedAt: Date | string;
  expiresAt: Date | string;
  pdaAddress?: string | null;
}

