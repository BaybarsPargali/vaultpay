# VaultPay: Compliant B2B Privacy Infrastructure for Solana

## Technical Specification & MVP Documentation

**Version:** 1.0  
**Date:** January 2026  
**Status:** Draft for Development

---

# Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Roadmap](#product-vision--roadmap)
3. [Phase 1: Private Treasury & Payroll MVP](#phase-1-private-treasury--payroll-mvp)
4. [Technical Architecture](#technical-architecture)
5. [Core Integrations](#core-integrations)
6. [Data Models & Schema](#data-models--schema)
7. [API Specifications](#api-specifications)
8. [Security & Compliance Framework](#security--compliance-framework)
9. [Phase 2: Private OTC Expansion](#phase-2-private-otc-expansion)
10. [Implementation Timeline](#implementation-timeline)
11. [Go-to-Market Strategy](#go-to-market-strategy)
12. [Appendices](#appendices)

---

# Executive Summary

## The Opportunity

VaultPay addresses a critical gap in the Solana ecosystem: **compliant privacy infrastructure for businesses and institutions**. While consumer privacy solutions exist, no production-ready platform enables organizations to:

- Pay employees/contractors without exposing compensation structures
- Manage treasury operations without revealing strategic positions
- Maintain regulatory compliance while preserving confidentiality
- Execute large transactions without market impact

## Market Validation

| Indicator | Data Point |
|-----------|------------|
| Privacy Cash volume | $121M in 100 days |
| Umbra ICO | $155M committed (52x oversubscribed) |
| MEV extraction | $13.4M/month by single operator |
| Institutional Solana TVL | Growing 18% QoQ |
| Competitors in B2B privacy | **Zero** |

## Solution Overview

VaultPay is a two-phase platform:

**Phase 1 (MVP):** Private Treasury & Payroll Platform
- Confidential payroll disbursement
- Hidden treasury balances
- Compliance-ready with auditor access
- Multi-signature governance

**Phase 2 (Expansion):** Private OTC Desk
- Encrypted order matching
- Institutional dark pool
- Large block trading
- Regulatory compliance built-in

## Technology Stack

| Component | Solution | Status |
|-----------|----------|--------|
| Private payments | Token-2022 Confidential Transfers | ✅ Production |
| Hidden balances | Token-2022 Confidential Extensions | ✅ Production |
| MPC Encryption | Arcium Network | ✅ Production |
| Compliance | Range Protocol | ✅ Production |
| Multi-sig | Squads Protocol | ✅ Production |
| Infrastructure | Helius RPC | ✅ Production |

> **Note:** This specification was written during the planning phase. For current implementation details, see [svp/README.md](svp/README.md) and [svp/PRIVACY-ARCHITECTURE.md](svp/PRIVACY-ARCHITECTURE.md).

---

# Product Vision & Roadmap

## Vision Statement

> "Become THE institutional privacy layer for Solana—enabling compliant, confidential financial operations for DAOs, businesses, and institutions."

## Strategic Phases

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VAULTPAY ROADMAP                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Q1 2026          Q2 2026          Q3 2026          Q4 2026        │
│  ────────         ────────         ────────         ────────        │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  MVP     │    │ Scale    │    │  OTC     │    │ Full     │      │
│  │ Launch   │───▶│ Payroll  │───▶│ Beta     │───▶│ Platform │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                     │
│  • Core payroll   • Multi-token   • Dark pool    • Institutional   │
│  • Treasury       • API access    • Block trades • White-label     │
│  • Compliance     • Integrations  • Arcium       • Full OTC        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Success Metrics

### Phase 1 Targets (6 months post-launch)

| Metric | Target |
|--------|--------|
| Organizations onboarded | 50+ |
| Monthly payroll volume | $5M+ |
| Treasury AUM | $25M+ |
| Monthly recurring revenue | $50K+ |
| Net Promoter Score | 50+ |

### Phase 2 Targets (12 months post-launch)

| Metric | Target |
|--------|--------|
| OTC volume | $100M+ monthly |
| Institutional clients | 25+ |
| Platform revenue | $500K+ monthly |

---

# Phase 1: Private Treasury & Payroll MVP

## Feature Overview

### 1. Organization Management

**1.1 Organization Creation**
- Create organization with multi-sig governance
- Define admin roles and permissions
- Set up treasury wallet(s)
- Configure compliance requirements

**1.2 Team Management**
- Add/remove team members
- Assign roles (Admin, Treasurer, Viewer)
- Link to SAS attestations for KYC
- Permission-based access control

### 2. Treasury Management

**2.1 Confidential Treasury Wallet**
- Hidden SOL/SPL token balances using Token-2022 Confidential Extensions
- Only authorized members can view actual balances
- External observers see encrypted ciphertext
- Auditor key for regulatory access

**2.2 Treasury Operations**
- Deposit funds (with optional privacy)
- Internal transfers between treasury accounts
- Multi-sig approval workflows
- Transaction history (encrypted)

**2.3 Treasury Dashboard**
- Real-time balance view (decrypted for authorized users)
- Spending analytics (internal only)
- Budget tracking
- Runway calculations

### 3. Private Payroll System

**3.1 Payee Management**
- Add payees with private Umbra addresses
- Link payees to SAS attestations (optional KYC)
- Set payment schedules
- Define compensation (hidden from other payees)

**3.2 Payment Execution**
- One-click batch payroll
- Individual ad-hoc payments
- Scheduled recurring payments
- Multi-token support (SOL, USDC, USDT)

**3.3 Privacy Guarantees**
- Sender (organization) address visible
- Recipient addresses unlinkable (Umbra stealth addresses)
- Amounts hidden (Confidential Extensions)
- Payment schedules private

**3.4 Payee Experience**
- Payees receive to fresh, unlinkable addresses
- Can withdraw to any wallet
- View payment history (their own only)
- Export records for tax purposes

### 4. Compliance & Audit

**4.1 SAS Integration**
- Require attestations for payees
- Geographic restrictions
- Accreditation verification
- Custom compliance rules

**4.2 Auditor Access**
- Designated auditor public key
- Can decrypt specific transactions
- Read-only access
- Audit log of auditor queries

**4.3 Reporting**
- Generate compliance reports
- Export transaction records (decrypted)
- Tax documentation
- Proof of payment certificates

### 5. User Interface

**5.1 Web Dashboard**
- Organization overview
- Treasury management
- Payroll execution
- Settings & compliance

**5.2 Notifications**
- Payment confirmations
- Approval requests
- Low balance alerts
- Compliance reminders

---

## MVP Feature Prioritization

### Must Have (P0) - Launch Requirements

| Feature | Description | Effort |
|---------|-------------|--------|
| Org creation | Multi-sig setup, basic roles | 2 weeks |
| Treasury wallet | Confidential balance setup | 2 weeks |
| Deposit/withdraw | Fund treasury operations | 1 week |
| Payee management | Add/manage recipients | 1 week |
| Single payments | One-off private payments | 2 weeks |
| Batch payroll | Execute payroll to multiple recipients | 2 weeks |
| Basic dashboard | Treasury view, payment history | 2 weeks |
| Umbra integration | Stealth address payments | 2 weeks |
| Token-2022 integration | Confidential balances | 2 weeks |

### Should Have (P1) - Post-Launch Sprint 1

| Feature | Description | Effort |
|---------|-------------|--------|
| Recurring payments | Scheduled payroll automation | 2 weeks |
| Multi-token support | USDC, USDT beyond SOL | 1 week |
| SAS integration | Attestation verification | 2 weeks |
| Auditor key setup | Compliance decrypt access | 1 week |
| Mobile-responsive UI | Responsive design | 1 week |
| Export functionality | CSV/PDF reports | 1 week |

### Nice to Have (P2) - Future Sprints

| Feature | Description | Effort |
|---------|-------------|--------|
| API access | Programmatic integration | 3 weeks |
| Webhooks | Event notifications | 1 week |
| Custom approval flows | Configurable multi-sig | 2 weeks |
| Budget management | Spending limits, alerts | 2 weeks |
| Team analytics | Internal spending insights | 2 weeks |
| White-label | Custom branding | 3 weeks |

---

# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           VAULTPAY ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Web App    │    │  Mobile App  │    │   API SDK    │              │
│  │   (React)    │    │   (Future)   │    │  (TypeScript)│              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │                    Client-Side SDK                        │          │
│  │  • Wallet connection (Phantom, Backpack, etc.)           │          │
│  │  • Transaction building                                   │          │
│  │  • Proof generation (ZK range proofs)                    │          │
│  │  • Encryption/decryption (ElGamal)                       │          │
│  └──────────────────────────┬───────────────────────────────┘          │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐          │
│  │                      API Server                           │          │
│  │                    (Node.js/Express)                      │          │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │          │
│  │  │   Auth     │ │   Org      │ │  Payroll   │            │          │
│  │  │  Service   │ │  Service   │ │  Service   │            │          │
│  │  └────────────┘ └────────────┘ └────────────┘            │          │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │          │
│  │  │  Treasury  │ │ Compliance │ │ Notification│           │          │
│  │  │  Service   │ │  Service   │ │  Service   │            │          │
│  │  └────────────┘ └────────────┘ └────────────┘            │          │
│  └──────────────────────────┬───────────────────────────────┘          │
│                             │                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  PostgreSQL  │    │    Redis     │    │  Job Queue   │              │
│  │   Database   │    │    Cache     │    │   (Bull)     │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BLOCKCHAIN LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        SOLANA MAINNET                            │   │
│  │                                                                   │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │   │
│  │  │   Token-2022   │  │   VaultPay     │  │      SAS       │     │   │
│  │  │   Program      │  │   Program      │  │    Program     │     │   │
│  │  │ (Confidential) │  │  (Treasury)    │  │ (Attestations) │     │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        UMBRA NETWORK                             │   │
│  │                    (Stealth Addresses)                           │   │
│  │  • Stealth address generation                                    │   │
│  │  • Unlinkable payments                                          │   │
│  │  • Auditor key management                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ARCIUM NETWORK (Phase 2)                      │   │
│  │                  (Confidential Compute)                          │   │
│  │  • MPC order matching                                            │   │
│  │  • Encrypted state                                               │   │
│  │  • Dark pool execution                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Layer

#### 1.1 Web Application (React + TypeScript)

```typescript
// Tech Stack
{
  "framework": "Next.js 14",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "state": "Zustand",
  "wallet": "@solana/wallet-adapter-react",
  "queries": "TanStack Query",
  "forms": "React Hook Form + Zod"
}
```

**Key Components:**
- `OrganizationDashboard` - Main org overview
- `TreasuryManager` - Balance and operations
- `PayrollExecutor` - Payment execution UI
- `ComplianceCenter` - Attestations and audit
- `SettingsPanel` - Configuration

#### 1.2 Client SDK

```typescript
// @vaultpay/sdk
interface VaultPaySDK {
  // Organization
  createOrganization(config: OrgConfig): Promise<Organization>;
  getOrganization(id: string): Promise<Organization>;
  
  // Treasury
  initializeTreasury(orgId: string, mint: PublicKey): Promise<Treasury>;
  depositToTreasury(treasury: Treasury, amount: bigint): Promise<TxSignature>;
  getDecryptedBalance(treasury: Treasury): Promise<bigint>;
  
  // Payroll
  addPayee(orgId: string, payee: PayeeConfig): Promise<Payee>;
  executePayment(payment: PaymentConfig): Promise<PaymentResult>;
  executeBatchPayroll(batch: BatchConfig): Promise<BatchResult>;
  
  // Compliance
  verifyAttestation(payee: Payee, type: AttestationType): Promise<boolean>;
  generateAuditReport(orgId: string, range: DateRange): Promise<AuditReport>;
}
```

### 2. Backend Layer

#### 2.1 API Server Architecture

```typescript
// Directory Structure
src/
├── api/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── organizations.ts
│   │   ├── treasury.ts
│   │   ├── payroll.ts
│   │   └── compliance.ts
│   └── middleware/
│       ├── auth.ts
│       ├── rateLimit.ts
│       └── validation.ts
├── services/
│   ├── OrganizationService.ts
│   ├── TreasuryService.ts
│   ├── PayrollService.ts
│   ├── ComplianceService.ts
│   └── NotificationService.ts
├── blockchain/
│   ├── solana.ts
│   ├── umbra.ts
│   ├── token2022.ts
│   └── sas.ts
├── models/
│   ├── Organization.ts
│   ├── Treasury.ts
│   ├── Payee.ts
│   └── Payment.ts
└── utils/
    ├── encryption.ts
    ├── proofs.ts
    └── validation.ts
```

#### 2.2 Database Schema (PostgreSQL)

```sql
-- See Data Models section for complete schema
```

#### 2.3 Job Queue (Bull + Redis)

```typescript
// Job Types
enum JobType {
  EXECUTE_PAYMENT = 'execute_payment',
  EXECUTE_BATCH = 'execute_batch',
  SCHEDULED_PAYROLL = 'scheduled_payroll',
  VERIFY_ATTESTATION = 'verify_attestation',
  GENERATE_REPORT = 'generate_report',
  SEND_NOTIFICATION = 'send_notification'
}
```

### 3. Blockchain Layer

#### 3.1 VaultPay Program (Anchor/Rust)

```rust
// Program Structure
#[program]
pub mod vaultpay {
    // Organization Management
    pub fn create_organization(ctx: Context<CreateOrg>, config: OrgConfig) -> Result<()>;
    pub fn add_member(ctx: Context<AddMember>, member: Pubkey, role: Role) -> Result<()>;
    pub fn remove_member(ctx: Context<RemoveMember>, member: Pubkey) -> Result<()>;
    
    // Treasury Management
    pub fn initialize_treasury(ctx: Context<InitTreasury>, mint: Pubkey) -> Result<()>;
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()>;
    pub fn approve_withdrawal(ctx: Context<ApproveWithdrawal>, withdrawal_id: u64) -> Result<()>;
    
    // Payment Registry
    pub fn register_payment(ctx: Context<RegisterPayment>, payment: PaymentRecord) -> Result<()>;
    pub fn complete_payment(ctx: Context<CompletePayment>, payment_id: u64, signature: [u8; 64]) -> Result<()>;
}
```

#### 3.2 Program Accounts

```rust
#[account]
pub struct Organization {
    pub id: [u8; 32],
    pub name: String,
    pub admin: Pubkey,
    pub members: Vec<Member>,
    pub treasuries: Vec<Pubkey>,
    pub config: OrgConfig,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Treasury {
    pub org: Pubkey,
    pub mint: Pubkey,
    pub confidential_account: Pubkey,
    pub auditor_key: Option<Pubkey>,
    pub approval_threshold: u8,
    pub bump: u8,
}

#[account]
pub struct PaymentRecord {
    pub id: u64,
    pub org: Pubkey,
    pub treasury: Pubkey,
    pub recipient_hash: [u8; 32],  // Hash of Umbra address
    pub amount_commitment: [u8; 32],  // Pedersen commitment
    pub status: PaymentStatus,
    pub created_at: i64,
    pub executed_at: Option<i64>,
    pub signature: Option<[u8; 64]>,
}
```

---

# Core Integrations

## 1. Umbra SDK Integration

### Overview

Umbra provides stealth addresses for unlinkable payments. When a payment is made, the recipient receives funds at a fresh address that cannot be linked to their main wallet.

### Integration Points

```typescript
import { UmbraSDK, StealthAddress, Payment } from '@umbra/sdk';

class UmbraIntegration {
  private umbra: UmbraSDK;
  
  constructor(connection: Connection) {
    this.umbra = new UmbraSDK({
      connection,
      network: 'mainnet-beta'
    });
  }
  
  /**
   * Generate a stealth address for a recipient
   */
  async generateStealthAddress(
    recipientPublicKey: PublicKey
  ): Promise<StealthAddress> {
    // Recipient must have registered their stealth meta-address
    const metaAddress = await this.umbra.getMetaAddress(recipientPublicKey);
    
    // Generate one-time stealth address
    const stealthAddress = await this.umbra.generateStealthAddress(metaAddress);
    
    return {
      address: stealthAddress.address,
      ephemeralPublicKey: stealthAddress.ephemeralPubKey,
      viewTag: stealthAddress.viewTag
    };
  }
  
  /**
   * Execute private payment to stealth address
   */
  async executePrivatePayment(
    sender: Keypair,
    recipient: PublicKey,
    amount: bigint,
    mint: PublicKey
  ): Promise<PaymentResult> {
    // Generate stealth address
    const stealth = await this.generateStealthAddress(recipient);
    
    // Build payment transaction
    const tx = await this.umbra.buildPaymentTransaction({
      sender: sender.publicKey,
      stealthAddress: stealth.address,
      amount,
      mint,
      ephemeralPublicKey: stealth.ephemeralPublicKey
    });
    
    // Sign and send
    tx.sign([sender]);
    const signature = await this.connection.sendTransaction(tx);
    
    return {
      signature,
      stealthAddress: stealth.address,
      ephemeralPublicKey: stealth.ephemeralPublicKey
    };
  }
  
  /**
   * Register organization for Umbra with auditor key
   */
  async registerWithAuditor(
    organization: Keypair,
    auditorPublicKey: PublicKey
  ): Promise<void> {
    await this.umbra.registerAuditor({
      organization: organization.publicKey,
      auditorKey: auditorPublicKey,
      permissions: ['decrypt_amounts', 'view_recipients']
    });
  }
}
```

### Umbra Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UMBRA PAYMENT FLOW                               │
└─────────────────────────────────────────────────────────────────────┘

1. PAYEE REGISTRATION
   ┌──────────┐                      ┌──────────┐
   │  Payee   │  Register meta-addr  │  Umbra   │
   │  Wallet  │─────────────────────▶│ Registry │
   └──────────┘                      └──────────┘

2. PAYMENT EXECUTION
   ┌──────────┐  Get meta-addr  ┌──────────┐
   │ VaultPay │────────────────▶│  Umbra   │
   │  Server  │                 │ Registry │
   └────┬─────┘                 └──────────┘
        │
        │ Generate stealth address
        ▼
   ┌──────────┐  Send payment   ┌──────────┐
   │ Treasury │────────────────▶│ Stealth  │
   │  Wallet  │                 │ Address  │
   └──────────┘                 └──────────┘

3. PAYEE SCANNING
   ┌──────────┐  Scan events    ┌──────────┐
   │  Payee   │────────────────▶│  Umbra   │
   │  Wallet  │                 │ Registry │
   └────┬─────┘                 └──────────┘
        │
        │ Decrypt with viewing key
        ▼
   ┌──────────┐  Withdraw       ┌──────────┐
   │ Stealth  │────────────────▶│   Any    │
   │ Address  │                 │  Wallet  │
   └──────────┘                 └──────────┘
```

## 2. Token-2022 Confidential Extensions

### Overview

Token-2022's Confidential Transfer extension encrypts balances and transfer amounts using ElGamal encryption with zero-knowledge range proofs.

### Integration Points

```typescript
import {
  createConfidentialTransferMint,
  configureConfidentialTransferAccount,
  confidentialTransfer,
  decryptBalance
} from '@solana/spl-token';

class ConfidentialTokenIntegration {
  private connection: Connection;
  
  /**
   * Initialize a mint with confidential transfer extension
   */
  async initializeConfidentialMint(
    payer: Keypair,
    mintAuthority: PublicKey,
    auditorElGamalPubkey?: ElGamalPubkey
  ): Promise<PublicKey> {
    const mint = Keypair.generate();
    
    const transaction = new Transaction().add(
      // Create mint account
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: getMintLen([ExtensionType.ConfidentialTransferMint]),
        lamports: await getMinimumBalanceForRentExemption(connection, mintLen),
        programId: TOKEN_2022_PROGRAM_ID
      }),
      // Initialize confidential transfer mint
      createInitializeConfidentialTransferMintInstruction(
        mint.publicKey,
        auditorElGamalPubkey ?? null,  // Optional auditor
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize mint
      createInitializeMintInstruction(
        mint.publicKey,
        9,  // decimals
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    await sendAndConfirmTransaction(connection, transaction, [payer, mint]);
    return mint.publicKey;
  }
  
  /**
   * Configure account for confidential transfers
   */
  async configureConfidentialAccount(
    payer: Keypair,
    tokenAccount: PublicKey,
    owner: Keypair
  ): Promise<void> {
    // Generate ElGamal keypair for this account
    const elGamalKeypair = ElGamal.generateKeypair();
    
    // Generate AES key for decrypting pending balance
    const aesKey = generateAesKey();
    
    // Create proof data
    const proofData = await createPubkeyValidityProof(elGamalKeypair);
    
    const transaction = new Transaction().add(
      createConfigureConfidentialTransferAccountInstruction(
        tokenAccount,
        owner.publicKey,
        null,  // No maximum pending balance
        elGamalKeypair.publicKey,
        aesKey,
        proofData,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    await sendAndConfirmTransaction(connection, transaction, [payer, owner]);
    
    // Store keys securely (encrypted with user's key)
    await this.storeAccountKeys(tokenAccount, elGamalKeypair, aesKey);
  }
  
  /**
   * Execute confidential transfer
   */
  async confidentialTransfer(
    payer: Keypair,
    source: PublicKey,
    destination: PublicKey,
    owner: Keypair,
    amount: bigint
  ): Promise<string> {
    // Get source account keys
    const sourceKeys = await this.getAccountKeys(source);
    
    // Get current available balance
    const accountInfo = await getConfidentialTransferAccount(connection, source);
    const availableBalance = decryptBalance(
      accountInfo.availableBalance,
      sourceKeys.elGamalKeypair
    );
    
    // Validate sufficient balance
    if (availableBalance < amount) {
      throw new Error('Insufficient confidential balance');
    }
    
    // Generate transfer proof
    const proofData = await createTransferProof({
      sourceBalance: availableBalance,
      transferAmount: amount,
      sourceElGamal: sourceKeys.elGamalKeypair,
      destinationElGamal: await getDestinationElGamalPubkey(destination)
    });
    
    const transaction = new Transaction().add(
      createConfidentialTransferInstruction(
        source,
        destination,
        owner.publicKey,
        proofData,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    return await sendAndConfirmTransaction(connection, transaction, [payer, owner]);
  }
  
  /**
   * Decrypt balance for authorized viewer
   */
  async getDecryptedBalance(
    account: PublicKey,
    viewerKeypair: ElGamalKeypair
  ): Promise<bigint> {
    const accountInfo = await getConfidentialTransferAccount(connection, account);
    
    // Decrypt available balance
    const availableBalance = decryptBalance(
      accountInfo.availableBalance,
      viewerKeypair
    );
    
    // Decrypt pending balance
    const pendingBalance = decryptPendingBalance(
      accountInfo.pendingBalanceLo,
      accountInfo.pendingBalanceHi,
      viewerKeypair
    );
    
    return availableBalance + pendingBalance;
  }
}
```

### Confidential Transfer Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              CONFIDENTIAL TRANSFER FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. ACCOUNT SETUP
   ┌──────────┐                      ┌──────────────────────┐
   │   User   │  Configure account   │   Token Account      │
   │          │─────────────────────▶│   + ElGamal pubkey   │
   │          │                      │   + Decryption key   │
   └──────────┘                      └──────────────────────┘

2. DEPOSIT (Public → Confidential)
   ┌──────────┐  deposit_to_cft     ┌──────────────────────┐
   │  Public  │───────────────────▶ │  Confidential        │
   │  Balance │                     │  Pending Balance     │
   └──────────┘                     └──────────────────────┘
                                              │
                                    apply_pending_balance
                                              │
                                              ▼
                                    ┌──────────────────────┐
                                    │  Confidential        │
                                    │  Available Balance   │
                                    └──────────────────────┘

3. CONFIDENTIAL TRANSFER
   ┌──────────┐                      ┌──────────────────────┐
   │  Source  │  Generate proof      │                      │
   │  Account │  • Range proof       │                      │
   │          │  • Equality proof    │                      │
   └────┬─────┘                      │                      │
        │                            │                      │
        │  Transfer (encrypted)      │                      │
        └───────────────────────────▶│  Destination         │
                                     │  Account             │
   On-chain observer sees:           │                      │
   • Ciphertext amounts              │                      │
   • Valid proof verification        └──────────────────────┘
   • NO actual amounts

4. BALANCE VIEWING
   ┌──────────┐                      ┌──────────┐
   │  Owner   │  Decrypt with        │  Actual  │
   │   OR     │  ElGamal privkey     │  Balance │
   │ Auditor  │─────────────────────▶│  Value   │
   └──────────┘                      └──────────┘
```

## 3. Solana Attestation Service (SAS)

### Overview

SAS enables verifiable credentials on-chain without exposing underlying data. Perfect for KYC, accreditation, and geographic compliance.

### Integration Points

```typescript
import { SolanaAttestationService, Attestation, Schema } from '@solana/sas-sdk';

class SASIntegration {
  private sas: SolanaAttestationService;
  
  /**
   * Define attestation schema for VaultPay
   */
  async createVaultPaySchemas(): Promise<void> {
    // KYC Attestation Schema
    const kycSchema: Schema = {
      name: 'vaultpay_kyc',
      fields: [
        { name: 'verified', type: 'bool' },
        { name: 'level', type: 'u8' },  // 1=basic, 2=enhanced, 3=institutional
        { name: 'jurisdiction', type: 'string' },
        { name: 'expires_at', type: 'i64' }
      ],
      revocable: true
    };
    
    await this.sas.createSchema(kycSchema);
    
    // Accreditation Schema
    const accreditationSchema: Schema = {
      name: 'vaultpay_accreditation',
      fields: [
        { name: 'type', type: 'string' },  // 'qualified_purchaser', 'accredited_investor'
        { name: 'verified_at', type: 'i64' },
        { name: 'verifier', type: 'pubkey' }
      ],
      revocable: true
    };
    
    await this.sas.createSchema(accreditationSchema);
    
    // Geographic Eligibility Schema
    const geoSchema: Schema = {
      name: 'vaultpay_geo',
      fields: [
        { name: 'allowed_regions', type: 'string[]' },
        { name: 'blocked_regions', type: 'string[]' },
        { name: 'verified_at', type: 'i64' }
      ],
      revocable: true
    };
    
    await this.sas.createSchema(geoSchema);
  }
  
  /**
   * Issue KYC attestation to user
   */
  async issueKYCAttestation(
    issuer: Keypair,
    recipient: PublicKey,
    kycData: KYCData
  ): Promise<Attestation> {
    const attestation = await this.sas.attest({
      schema: 'vaultpay_kyc',
      issuer: issuer.publicKey,
      recipient,
      data: {
        verified: kycData.verified,
        level: kycData.level,
        jurisdiction: kycData.jurisdiction,
        expires_at: kycData.expiresAt.getTime() / 1000
      },
      revocable: true
    });
    
    return attestation;
  }
  
  /**
   * Verify attestation for payee
   */
  async verifyPayeeCompliance(
    payee: PublicKey,
    requirements: ComplianceRequirements
  ): Promise<ComplianceResult> {
    const result: ComplianceResult = {
      passed: true,
      checks: []
    };
    
    // Check KYC if required
    if (requirements.requireKYC) {
      const kycAttestation = await this.sas.getAttestation(
        payee,
        'vaultpay_kyc'
      );
      
      if (!kycAttestation || kycAttestation.data.expires_at < Date.now() / 1000) {
        result.passed = false;
        result.checks.push({ type: 'kyc', passed: false, reason: 'Missing or expired KYC' });
      } else if (kycAttestation.data.level < requirements.minKYCLevel) {
        result.passed = false;
        result.checks.push({ type: 'kyc', passed: false, reason: 'Insufficient KYC level' });
      } else {
        result.checks.push({ type: 'kyc', passed: true });
      }
    }
    
    // Check geographic eligibility
    if (requirements.allowedRegions?.length) {
      const geoAttestation = await this.sas.getAttestation(
        payee,
        'vaultpay_geo'
      );
      
      if (!geoAttestation) {
        result.passed = false;
        result.checks.push({ type: 'geo', passed: false, reason: 'No geographic attestation' });
      } else {
        const allowed = requirements.allowedRegions.some(
          region => geoAttestation.data.allowed_regions.includes(region)
        );
        
        if (!allowed) {
          result.passed = false;
          result.checks.push({ type: 'geo', passed: false, reason: 'Region not allowed' });
        } else {
          result.checks.push({ type: 'geo', passed: true });
        }
      }
    }
    
    // Check accreditation if required
    if (requirements.requireAccreditation) {
      const accredAttestation = await this.sas.getAttestation(
        payee,
        'vaultpay_accreditation'
      );
      
      if (!accredAttestation) {
        result.passed = false;
        result.checks.push({ type: 'accreditation', passed: false, reason: 'Not accredited' });
      } else {
        result.checks.push({ type: 'accreditation', passed: true });
      }
    }
    
    return result;
  }
}
```

### SAS Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                 SAS COMPLIANCE VERIFICATION                         │
└─────────────────────────────────────────────────────────────────────┘

1. ATTESTATION ISSUANCE (Off-chain KYC provider)
   ┌──────────┐  Complete KYC  ┌──────────┐  Issue         ┌──────────┐
   │   User   │───────────────▶│   KYC    │  attestation   │   SAS    │
   │          │                │ Provider │───────────────▶│  On-chain│
   └──────────┘                └──────────┘                └──────────┘

2. PAYEE REGISTRATION
   ┌──────────┐  Add payee     ┌──────────┐  Check SAS     ┌──────────┐
   │   Org    │───────────────▶│ VaultPay │───────────────▶│   SAS    │
   │  Admin   │                │  Server  │                │ Registry │
   └──────────┘                └────┬─────┘                └────┬─────┘
                                    │                           │
                                    │◀─────── Attestation ──────┘
                                    │         verified
                                    ▼
                              ┌──────────┐
                              │  Payee   │
                              │ Approved │
                              └──────────┘

3. PAYMENT EXECUTION
   ┌──────────┐  Execute       ┌──────────┐  Verify         ┌──────────┐
   │   Org    │  payment       │ VaultPay │  attestation    │   SAS    │
   │          │───────────────▶│          │  still valid    │          │
   └──────────┘                └────┬─────┘◀────────────────┘──────────┘
                                    │
                                    │ If valid
                                    ▼
                              ┌──────────┐
                              │ Payment  │
                              │ Executed │
                              └──────────┘
```

---

# Data Models & Schema

## Database Schema (PostgreSQL)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- On-chain references
    program_id VARCHAR(44) NOT NULL,
    org_account VARCHAR(44) UNIQUE NOT NULL,
    
    -- Multi-sig configuration
    admin_pubkey VARCHAR(44) NOT NULL,
    approval_threshold SMALLINT NOT NULL DEFAULT 1,
    
    -- Compliance settings
    require_kyc BOOLEAN DEFAULT false,
    min_kyc_level SMALLINT DEFAULT 1,
    allowed_regions TEXT[],
    require_accreditation BOOLEAN DEFAULT false,
    
    -- Auditor configuration
    auditor_pubkey VARCHAR(44),
    auditor_permissions TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Organization Members
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Member details
    pubkey VARCHAR(44) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'admin', 'treasurer', 'member', 'viewer'
    
    -- Permissions
    can_approve_payments BOOLEAN DEFAULT false,
    can_add_payees BOOLEAN DEFAULT false,
    can_view_balances BOOLEAN DEFAULT false,
    can_generate_reports BOOLEAN DEFAULT false,
    
    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES organization_members(id),
    status VARCHAR(20) DEFAULT 'active',
    
    UNIQUE(org_id, pubkey)
);

-- Treasuries
CREATE TABLE treasuries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Token details
    mint VARCHAR(44) NOT NULL,
    token_symbol VARCHAR(20),
    decimals SMALLINT NOT NULL,
    
    -- On-chain accounts
    treasury_account VARCHAR(44) NOT NULL,
    confidential_account VARCHAR(44),
    
    -- Encryption keys (encrypted at rest)
    elgamal_pubkey TEXT,
    encrypted_elgamal_privkey TEXT, -- Encrypted with org master key
    encrypted_aes_key TEXT,
    
    -- Auditor key (can decrypt balances)
    auditor_elgamal_pubkey TEXT,
    
    -- Metadata
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    
    UNIQUE(org_id, mint)
);

-- Payees
CREATE TABLE payees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Payee identification (internal)
    name VARCHAR(255),
    email VARCHAR(255),
    external_id VARCHAR(100), -- For integration with HR systems
    
    -- Solana details
    main_pubkey VARCHAR(44), -- Their registered public key
    
    -- Umbra stealth address details
    umbra_meta_address TEXT, -- Their Umbra meta-address
    
    -- Compliance
    kyc_attestation_id VARCHAR(44),
    kyc_verified BOOLEAN DEFAULT false,
    kyc_level SMALLINT,
    geo_attestation_id VARCHAR(44),
    accreditation_attestation_id VARCHAR(44),
    
    -- Payment preferences
    preferred_mint VARCHAR(44),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    
    UNIQUE(org_id, email)
);

-- Payment Schedules
CREATE TABLE payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Schedule details
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'once'
    day_of_week SMALLINT, -- 0-6 for weekly
    day_of_month SMALLINT, -- 1-31 for monthly
    
    -- Payment details
    treasury_id UUID REFERENCES treasuries(id),
    
    -- Included payees
    payee_ids UUID[],
    
    -- Metadata
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Scheduled Payments (individual payments within a schedule)
CREATE TABLE scheduled_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES payment_schedules(id) ON DELETE CASCADE,
    payee_id UUID REFERENCES payees(id) ON DELETE CASCADE,
    
    -- Amount (stored encrypted)
    encrypted_amount TEXT NOT NULL, -- Encrypted with org key
    mint VARCHAR(44) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Payments (executed payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    treasury_id UUID REFERENCES treasuries(id),
    payee_id UUID REFERENCES payees(id),
    schedule_id UUID REFERENCES payment_schedules(id),
    
    -- Amount (encrypted)
    encrypted_amount TEXT NOT NULL,
    mint VARCHAR(44) NOT NULL,
    
    -- Privacy details
    stealth_address VARCHAR(44), -- Umbra stealth address used
    ephemeral_pubkey TEXT, -- For recipient scanning
    
    -- On-chain details
    transaction_signature VARCHAR(88),
    slot BIGINT,
    
    -- Compliance
    compliance_check_passed BOOLEAN,
    compliance_details JSONB,
    
    -- Approval tracking
    required_approvals SMALLINT DEFAULT 1,
    approvals JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'approved', 'executing', 'completed', 'failed'
);

-- Payment Approvals
CREATE TABLE payment_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Approver details
    member_id UUID REFERENCES organization_members(id),
    pubkey VARCHAR(44) NOT NULL,
    
    -- Approval details
    approved BOOLEAN NOT NULL,
    signature VARCHAR(128), -- Signature of approval message
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    
    -- Actor
    actor_pubkey VARCHAR(44),
    actor_type VARCHAR(20), -- 'member', 'auditor', 'system'
    
    -- Action
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    
    -- Details
    details JSONB,
    ip_address INET,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_org_members_pubkey ON organization_members(pubkey);
CREATE INDEX idx_treasuries_org ON treasuries(org_id);
CREATE INDEX idx_payees_org ON payees(org_id);
CREATE INDEX idx_payments_org ON payments(org_id);
CREATE INDEX idx_payments_payee ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_audit_org ON audit_logs(org_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

## TypeScript Interfaces

```typescript
// Organization
interface Organization {
  id: string;
  name: string;
  slug: string;
  programId: string;
  orgAccount: string;
  adminPubkey: string;
  approvalThreshold: number;
  compliance: ComplianceConfig;
  auditor?: AuditorConfig;
  createdAt: Date;
  status: 'active' | 'suspended' | 'closed';
}

interface ComplianceConfig {
  requireKYC: boolean;
  minKYCLevel: 1 | 2 | 3;
  allowedRegions?: string[];
  requireAccreditation: boolean;
}

interface AuditorConfig {
  pubkey: string;
  permissions: ('decrypt_amounts' | 'view_recipients' | 'generate_reports')[];
}

// Treasury
interface Treasury {
  id: string;
  orgId: string;
  mint: string;
  tokenSymbol: string;
  decimals: number;
  treasuryAccount: string;
  confidentialAccount?: string;
  name?: string;
  status: 'active' | 'frozen';
}

interface TreasuryBalance {
  treasuryId: string;
  publicBalance: bigint;
  confidentialBalance?: bigint; // Only available to authorized viewers
  pendingBalance?: bigint;
}

// Payee
interface Payee {
  id: string;
  orgId: string;
  name: string;
  email: string;
  externalId?: string;
  mainPubkey: string;
  umbraMetaAddress: string;
  compliance: PayeeCompliance;
  preferredMint?: string;
  status: 'active' | 'suspended' | 'removed';
}

interface PayeeCompliance {
  kycVerified: boolean;
  kycLevel?: number;
  kycAttestationId?: string;
  geoAttestationId?: string;
  accreditationAttestationId?: string;
}

// Payment
interface Payment {
  id: string;
  orgId: string;
  treasuryId: string;
  payeeId: string;
  scheduleId?: string;
  amount: bigint; // Decrypted only for authorized users
  mint: string;
  stealthAddress?: string;
  ephemeralPubkey?: string;
  transactionSignature?: string;
  slot?: number;
  complianceCheckPassed: boolean;
  complianceDetails?: ComplianceResult;
  approvals: PaymentApproval[];
  requiredApprovals: number;
  createdAt: Date;
  executedAt?: Date;
  status: PaymentStatus;
}

type PaymentStatus = 
  | 'pending' 
  | 'awaiting_approval' 
  | 'approved' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

interface PaymentApproval {
  memberId: string;
  pubkey: string;
  approved: boolean;
  signature: string;
  createdAt: Date;
}

// Payment Schedule
interface PaymentSchedule {
  id: string;
  orgId: string;
  name: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'once';
  dayOfWeek?: number;
  dayOfMonth?: number;
  treasuryId: string;
  payments: ScheduledPayment[];
  nextRunAt?: Date;
  lastRunAt?: Date;
  status: 'active' | 'paused' | 'completed';
}

interface ScheduledPayment {
  id: string;
  scheduleId: string;
  payeeId: string;
  amount: bigint;
  mint: string;
}
```

---

# API Specifications

## REST API Endpoints

### Authentication

```yaml
# All endpoints require authentication via signed message
Headers:
  X-Wallet-Address: <pubkey>
  X-Signature: <signed_timestamp>
  X-Timestamp: <unix_timestamp>
```

### Organizations

```yaml
POST /api/v1/organizations
  Description: Create a new organization
  Request:
    name: string
    slug: string
    adminPubkey: string
    approvalThreshold: number
    compliance: ComplianceConfig
  Response:
    organization: Organization
    setupInstructions: TransactionInstruction[]

GET /api/v1/organizations/:id
  Description: Get organization details
  Response:
    organization: Organization
    members: OrganizationMember[]
    treasuries: Treasury[]

PUT /api/v1/organizations/:id
  Description: Update organization settings
  Request:
    name?: string
    compliance?: ComplianceConfig
    auditor?: AuditorConfig
  Response:
    organization: Organization

POST /api/v1/organizations/:id/members
  Description: Add organization member
  Request:
    pubkey: string
    role: 'admin' | 'treasurer' | 'member' | 'viewer'
    permissions: Permission[]
  Response:
    member: OrganizationMember

DELETE /api/v1/organizations/:id/members/:memberId
  Description: Remove organization member
  Response:
    success: boolean
```

### Treasuries

```yaml
POST /api/v1/organizations/:orgId/treasuries
  Description: Initialize a new treasury
  Request:
    mint: string
    name?: string
    enableConfidential: boolean
  Response:
    treasury: Treasury
    setupInstructions: TransactionInstruction[]

GET /api/v1/organizations/:orgId/treasuries
  Description: List all treasuries
  Response:
    treasuries: Treasury[]

GET /api/v1/organizations/:orgId/treasuries/:id
  Description: Get treasury details with balance
  Response:
    treasury: Treasury
    balance: TreasuryBalance

POST /api/v1/organizations/:orgId/treasuries/:id/deposit
  Description: Generate deposit instructions
  Request:
    amount: string
    confidential: boolean
  Response:
    instructions: TransactionInstruction[]
    depositAddress: string

POST /api/v1/organizations/:orgId/treasuries/:id/withdraw
  Description: Initiate withdrawal (requires approval)
  Request:
    amount: string
    destination: string
  Response:
    withdrawal: Withdrawal
    approvalRequired: boolean
```

### Payees

```yaml
POST /api/v1/organizations/:orgId/payees
  Description: Add a new payee
  Request:
    name: string
    email: string
    mainPubkey: string
    externalId?: string
    preferredMint?: string
  Response:
    payee: Payee
    registrationRequired: boolean
    registrationUrl?: string

GET /api/v1/organizations/:orgId/payees
  Description: List all payees
  Query:
    status?: 'active' | 'suspended'
    search?: string
    limit?: number
    offset?: number
  Response:
    payees: Payee[]
    total: number

GET /api/v1/organizations/:orgId/payees/:id
  Description: Get payee details
  Response:
    payee: Payee
    complianceStatus: ComplianceResult
    recentPayments: Payment[]

PUT /api/v1/organizations/:orgId/payees/:id
  Description: Update payee
  Request:
    name?: string
    email?: string
    preferredMint?: string
  Response:
    payee: Payee

POST /api/v1/organizations/:orgId/payees/:id/verify-compliance
  Description: Re-verify payee compliance
  Response:
    complianceResult: ComplianceResult
```

### Payments

```yaml
POST /api/v1/organizations/:orgId/payments
  Description: Create a new payment
  Request:
    treasuryId: string
    payeeId: string
    amount: string
    mint: string
    memo?: string
  Response:
    payment: Payment
    approvalRequired: boolean

POST /api/v1/organizations/:orgId/payments/batch
  Description: Create batch payment (payroll)
  Request:
    treasuryId: string
    payments: Array<{
      payeeId: string
      amount: string
      mint: string
    }>
  Response:
    batchId: string
    payments: Payment[]
    totalAmount: string
    approvalRequired: boolean

GET /api/v1/organizations/:orgId/payments
  Description: List payments
  Query:
    status?: PaymentStatus
    payeeId?: string
    treasuryId?: string
    from?: string (ISO date)
    to?: string (ISO date)
    limit?: number
    offset?: number
  Response:
    payments: Payment[]
    total: number

GET /api/v1/organizations/:orgId/payments/:id
  Description: Get payment details
  Response:
    payment: Payment
    transactionDetails?: TransactionDetails

POST /api/v1/organizations/:orgId/payments/:id/approve
  Description: Approve a payment
  Request:
    signature: string
  Response:
    payment: Payment
    readyToExecute: boolean

POST /api/v1/organizations/:orgId/payments/:id/execute
  Description: Execute an approved payment
  Response:
    payment: Payment
    transactionSignature: string

DELETE /api/v1/organizations/:orgId/payments/:id
  Description: Cancel a pending payment
  Response:
    success: boolean
```

### Schedules

```yaml
POST /api/v1/organizations/:orgId/schedules
  Description: Create payment schedule
  Request:
    name: string
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'once'
    dayOfWeek?: number
    dayOfMonth?: number
    treasuryId: string
    payments: Array<{
      payeeId: string
      amount: string
      mint: string
    }>
    startDate?: string
  Response:
    schedule: PaymentSchedule

GET /api/v1/organizations/:orgId/schedules
  Description: List all schedules
  Response:
    schedules: PaymentSchedule[]

GET /api/v1/organizations/:orgId/schedules/:id
  Description: Get schedule details
  Response:
    schedule: PaymentSchedule
    upcomingRuns: Date[]
    history: Payment[]

PUT /api/v1/organizations/:orgId/schedules/:id
  Description: Update schedule
  Request:
    name?: string
    payments?: Array<{...}>
    status?: 'active' | 'paused'
  Response:
    schedule: PaymentSchedule

POST /api/v1/organizations/:orgId/schedules/:id/run
  Description: Manually trigger schedule
  Response:
    batchId: string
    payments: Payment[]
```

### Reports & Compliance

```yaml
POST /api/v1/organizations/:orgId/reports/generate
  Description: Generate compliance report
  Request:
    type: 'payments' | 'treasury' | 'compliance' | 'tax'
    from: string (ISO date)
    to: string (ISO date)
    format: 'json' | 'csv' | 'pdf'
  Response:
    reportId: string
    status: 'generating'

GET /api/v1/organizations/:orgId/reports/:id
  Description: Get generated report
  Response:
    report: Report
    downloadUrl?: string

GET /api/v1/organizations/:orgId/audit-logs
  Description: Get audit logs
  Query:
    action?: string
    actorPubkey?: string
    from?: string
    to?: string
    limit?: number
  Response:
    logs: AuditLog[]
    total: number
```

---

# Security & Compliance Framework

## Security Architecture

### 1. Key Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                     KEY HIERARCHY                                   │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Organization      │
                    │   Master Key        │
                    │   (Multi-sig)       │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │   Treasury   │    │   Treasury   │    │   Auditor    │
   │  ElGamal Key │    │   AES Key    │    │  Viewing Key │
   └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Encrypt     │    │  Encrypt     │    │   Decrypt    │
   │  Balances    │    │  DB Records  │    │  for Audit   │
   └──────────────┘    └──────────────┘    └──────────────┘
```

### 2. Data Encryption

| Data Type | Encryption Method | Key |
|-----------|-------------------|-----|
| Treasury balances | ElGamal (on-chain) | Treasury ElGamal key |
| Transfer amounts | ElGamal (on-chain) | Treasury ElGamal key |
| DB payment amounts | AES-256-GCM | Organization AES key |
| DB payee details | AES-256-GCM | Organization AES key |
| API communication | TLS 1.3 | Server certificate |

### 3. Authentication Flow

```typescript
// Authentication middleware
async function authenticateRequest(req: Request): Promise<AuthContext> {
  const walletAddress = req.headers['x-wallet-address'];
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  
  // Validate timestamp (5 minute window)
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    throw new AuthError('Request timestamp expired');
  }
  
  // Verify signature
  const message = `VaultPay Authentication: ${timestamp}`;
  const isValid = await verifySignature(
    message,
    signature,
    new PublicKey(walletAddress)
  );
  
  if (!isValid) {
    throw new AuthError('Invalid signature');
  }
  
  // Get user context
  const memberships = await getMembershipsByPubkey(walletAddress);
  
  return {
    pubkey: walletAddress,
    memberships,
    timestamp: requestTime
  };
}
```

### 4. Authorization Matrix

| Role | View Balances | Execute Payments | Approve Payments | Add Payees | Admin Settings |
|------|--------------|------------------|------------------|------------|----------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Treasurer | ✅ | ✅ | ✅ | ✅ | ❌ |
| Member | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auditor | ✅ (decrypt) | ❌ | ❌ | ❌ | ❌ |

## Compliance Framework

### 1. KYC/AML Integration

```typescript
// Compliance check before payment
async function validatePaymentCompliance(
  org: Organization,
  payee: Payee,
  amount: bigint
): Promise<ComplianceResult> {
  const checks: ComplianceCheck[] = [];
  
  // 1. Verify KYC attestation
  if (org.compliance.requireKYC) {
    const kycResult = await verifyKYCAttestation(payee);
    checks.push(kycResult);
    
    if (!kycResult.passed) {
      return { passed: false, checks, reason: 'KYC verification failed' };
    }
  }
  
  // 2. Check geographic restrictions
  if (org.compliance.allowedRegions?.length) {
    const geoResult = await verifyGeographicEligibility(
      payee,
      org.compliance.allowedRegions
    );
    checks.push(geoResult);
    
    if (!geoResult.passed) {
      return { passed: false, checks, reason: 'Geographic restriction' };
    }
  }
  
  // 3. Sanctions screening
  const sanctionsResult = await screenAgainstSanctionsList(payee);
  checks.push(sanctionsResult);
  
  if (!sanctionsResult.passed) {
    return { passed: false, checks, reason: 'Sanctions match' };
  }
  
  // 4. Transaction limits
  const limitsResult = await checkTransactionLimits(org, payee, amount);
  checks.push(limitsResult);
  
  if (!limitsResult.passed) {
    return { passed: false, checks, reason: 'Transaction limit exceeded' };
  }
  
  return { passed: true, checks };
}
```

### 2. Audit Trail

```typescript
// Comprehensive audit logging
async function logAuditEvent(event: AuditEvent): Promise<void> {
  await db.auditLogs.create({
    orgId: event.orgId,
    actorPubkey: event.actor,
    actorType: event.actorType,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    details: {
      ...event.details,
      // Include cryptographic proof for critical actions
      proof: event.requiresProof ? await generateAuditProof(event) : undefined
    },
    ipAddress: event.ipAddress,
    timestamp: new Date()
  });
  
  // For critical actions, also emit on-chain event
  if (CRITICAL_ACTIONS.includes(event.action)) {
    await emitOnChainAuditEvent(event);
  }
}
```

### 3. Regulatory Reporting

| Report Type | Frequency | Contents |
|------------|-----------|----------|
| Transaction Summary | Monthly | All payments, amounts (encrypted), recipients |
| Treasury Report | Quarterly | Balance history, deposits, withdrawals |
| Compliance Report | On-demand | KYC status, attestation records |
| Tax Report | Annual | Payment totals by recipient, tax documentation |

---

# Phase 2: Private OTC Expansion

## Overview

Phase 2 leverages the institutional relationships built in Phase 1 to launch a private OTC desk for large block trades.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: PRIVATE OTC DESK                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         OTC FLOW                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐  │
│  │  Submit  │     │  Match   │     │  Settle  │     │  Clear   │  │
│  │  Order   │────▶│  Engine  │────▶│  Trade   │────▶│  Funds   │  │
│  │(encrypted)│    │ (Arcium) │     │(on-chain)│     │(private) │  │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘  │
│                                                                     │
│  Order details:    Matching on:     Settlement:      Clearing:     │
│  • Size (hidden)   • Encrypted      • Atomic swap    • Umbra       │
│  • Price (hidden)    order book     • Escrow         • Confidential│
│  • Direction       • MPC compute    • Multi-sig        Extensions  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Encrypted Order Book

```typescript
// Order submission (client-side encryption)
interface OTCOrder {
  id: string;
  trader: string;
  
  // Encrypted fields (only matching engine can decrypt)
  encryptedSize: string;
  encryptedPrice: string;
  encryptedDirection: string;  // buy/sell
  
  // Public fields
  pair: string;  // e.g., "SOL/USDC"
  minFillPercent: number;
  expiresAt: Date;
  
  // Compliance
  kycAttestationId: string;
  accreditationAttestationId?: string;
}
```

### 2. Arcium MPC Matching

```rust
// Confidential matching logic (runs in Arcium MXE)
#[arcium::confidential]
fn match_orders(
    buy_orders: Vec<EncryptedOrder>,
    sell_orders: Vec<EncryptedOrder>
) -> Vec<Match> {
    let mut matches = vec![];
    
    // Sort by price (encrypted comparison)
    let sorted_buys = sort_by_price_desc(buy_orders);
    let sorted_sells = sort_by_price_asc(sell_orders);
    
    // Match where buy price >= sell price
    for buy in sorted_buys {
        for sell in sorted_sells {
            if buy.price >= sell.price && !sell.filled {
                let match_size = min(buy.remaining, sell.remaining);
                let match_price = (buy.price + sell.price) / 2;
                
                matches.push(Match {
                    buy_order: buy.id,
                    sell_order: sell.id,
                    size: match_size,
                    price: match_price
                });
                
                buy.remaining -= match_size;
                sell.remaining -= match_size;
            }
        }
    }
    
    matches
}
```

### 3. Settlement Flow

```
1. Match confirmed (in Arcium MXE)
       │
       ▼
2. Create escrow accounts
   • Buyer deposits payment token
   • Seller deposits asset token
       │
       ▼
3. Atomic settlement transaction
   • Verify both escrows funded
   • Execute swap atomically
   • Transfer to stealth addresses
       │
       ▼
4. Clear via Umbra
   • Buyer receives asset at stealth address
   • Seller receives payment at stealth address
   • No on-chain link between parties
```

## Phase 2 Timeline

| Milestone | Target | Dependencies |
|-----------|--------|--------------|
| Arcium mainnet integration | Q1 2026 | Arcium full mainnet |
| OTC MVP (manual matching) | Q2 2026 | Phase 1 complete |
| Encrypted order book | Q2 2026 | Arcium integration |
| Automated matching | Q3 2026 | Order book live |
| Full dark pool | Q4 2026 | All components |

---

# Implementation Timeline

## Phase 1: MVP Development (12 weeks)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MVP DEVELOPMENT TIMELINE                         │
└─────────────────────────────────────────────────────────────────────┘

Week 1-2: Foundation
├── Project setup (repo, CI/CD, environments)
├── Database schema implementation
├── Basic API server scaffold
└── Wallet connection integration

Week 3-4: Organization Module
├── Organization creation flow
├── Member management
├── Role-based permissions
└── Multi-sig setup

Week 5-6: Treasury Module
├── Treasury initialization
├── Token-2022 confidential setup
├── Deposit/withdraw flows
└── Balance decryption

Week 7-8: Payroll Module
├── Payee management
├── Umbra SDK integration
├── Single payment execution
├── Batch payment execution

Week 9-10: Compliance Module
├── SAS integration
├── KYC verification flow
├── Auditor key setup
└── Compliance checks

Week 11-12: UI & Testing
├── Dashboard UI
├── Payment flows UI
├── Integration testing
├── Security audit prep

Week 13+: Launch Prep
├── Security audit
├── Bug fixes
├── Documentation
└── Beta launch
```

## Team Requirements

| Role | Count | Responsibilities |
|------|-------|------------------|
| Technical Lead | 1 | Architecture, blockchain integration |
| Full-Stack Developer | 2 | API, frontend, SDK |
| Solana Developer | 1 | Smart contracts, Token-2022 |
| DevOps Engineer | 1 | Infrastructure, security |
| Product Designer | 1 | UX/UI design |
| QA Engineer | 1 | Testing, security review |

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Redis |
| Blockchain | Solana, Anchor, Token-2022 |
| Privacy | Umbra SDK, Arcium (Phase 2) |
| Compliance | SAS |
| Infrastructure | AWS/GCP, Docker, Kubernetes |
| Monitoring | Datadog, Sentry |

---

# Go-to-Market Strategy

## Target Customers

### Primary (Phase 1)

| Segment | Size | Pain Point | Value Proposition |
|---------|------|------------|-------------------|
| DAOs | 500+ active | Public treasury, visible salaries | Hidden balances, private payroll |
| Crypto Funds | 200+ | Portfolio visibility, OTC exposure | Confidential treasury |
| Web3 Companies | 1000+ | Competitor intelligence via chain | Private operations |

### Secondary (Phase 2)

| Segment | Size | Pain Point | Value Proposition |
|---------|------|------------|-------------------|
| Market Makers | 50+ | Front-running, MEV | Dark pool access |
| Family Offices | 100+ | Privacy, compliance | Compliant confidentiality |
| Institutions | 200+ | Regulatory requirements | Audit-ready privacy |

## Pricing Strategy

### Phase 1: Treasury & Payroll

| Tier | Price | Features |
|------|-------|----------|
| Starter | $99/month | 1 treasury, 10 payees, basic features |
| Growth | $299/month | 3 treasuries, 50 payees, scheduling |
| Enterprise | $999/month | Unlimited, API access, dedicated support |

### Transaction Fees

| Feature | Fee |
|---------|-----|
| Private payment | 0.1% (min $0.50) |
| Batch payroll | 0.05% per payment |
| Report generation | Included |

### Phase 2: OTC

| Service | Fee |
|---------|-----|
| OTC matching | 0.1-0.25% per side |
| Minimum trade | $50,000 |
| White-label | Custom pricing |

## Launch Strategy

### Month 1-2: Private Beta
- 10-20 hand-selected DAOs/companies
- High-touch onboarding
- Rapid iteration based on feedback

### Month 3-4: Public Beta
- Open waitlist
- Content marketing (privacy narrative)
- Partnership announcements

### Month 5-6: General Availability
- Full public launch
- PR campaign
- Conference presence (Breakpoint, etc.)

## Success Metrics

| Metric | 6-month Target | 12-month Target |
|--------|----------------|-----------------|
| Organizations | 50 | 200 |
| Monthly Active Users | 500 | 2,000 |
| Monthly Volume | $5M | $50M |
| MRR | $50K | $200K |
| NPS | 50+ | 60+ |

---

# Appendices

## A. Glossary

| Term | Definition |
|------|------------|
| ElGamal | Asymmetric encryption scheme used for confidential transfers |
| MPC | Multi-Party Computation - compute on encrypted data |
| Stealth Address | One-time address unlinkable to recipient's main wallet |
| SAS | Solana Attestation Service - verifiable credentials |
| Token-2022 | Solana token program with extensions (confidential transfers) |
| Umbra | Privacy protocol for stealth addresses on Solana |
| Arcium | Confidential computing network using MPC |

## B. References

- Solana Token-2022 Documentation: https://spl.solana.com/token-2022
- Umbra Protocol Documentation: https://docs.umbraprivacy.com
- Arcium Documentation: https://docs.arcium.com
- SAS Documentation: https://docs.solana.com/sas

## C. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Regulatory changes | Medium | High | Compliance-first design, legal counsel |
| Smart contract vulnerability | Low | Critical | Multiple audits, bug bounty |
| Umbra/Arcium delays | Medium | Medium | Graceful degradation, fallbacks |
| Competition | Medium | Medium | First-mover advantage, relationships |
| Market downturn | Medium | Medium | Sustainable unit economics |

## D. Contact & Resources

- GitHub Repository: [To be created]
- Documentation: [To be created]
- Discord: [To be created]
- Twitter: [To be created]

---

*Document Version: 1.0*  
*Last Updated: January 2026*  
*Status: Ready for Development*
