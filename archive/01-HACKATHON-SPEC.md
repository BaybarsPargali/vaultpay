# VaultPay Hackathon MVP Specification

## 🎯 Project: Compliant Private Payroll on Solana

**Target Bounties:** Privacy Cash ($6K) + Range ($1.5K+) + Helius ($5K) = **Up to $12,500**

**Tagline:** *"Pay your team privately. Stay compliant. Built on Solana."*

---

## Executive Summary

VaultPay is the first compliant private payroll platform on Solana. Organizations can pay employees and contractors without exposing compensation structures, while maintaining full regulatory compliance through selective disclosure.

### Problem
- DAO/company salaries are publicly visible on-chain
- Competitors can see your burn rate and team size
- No privacy solution exists that's also compliant

### Solution
- Private transfers via Privacy Cash SDK
- Compliance pre-screening via Range
- Fast, reliable infrastructure via Helius

---

## 🏗️ MVP Scope (3-Day Build)

### What We're Building

```
┌─────────────────────────────────────────────────────────────────┐
│                    VAULTPAY MVP ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Next.js   │────▶│   Backend   │────▶│   Solana    │       │
│  │  Frontend   │     │    API      │     │  Mainnet    │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   │               │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Wallet    │     │    Range    │     │   Privacy   │       │
│  │  Adapter    │     │ Compliance  │     │    Cash     │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                             │                   │               │
│                             │                   │               │
│                             ▼                   ▼               │
│                      ┌─────────────┐     ┌─────────────┐       │
│                      │   Helius    │     │   Stealth   │       │
│                      │    RPCs     │     │  Addresses  │       │
│                      └─────────────┘     └─────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core Features (MVP)

| Feature | Priority | Day | Status |
|---------|----------|-----|--------|
| Wallet connection | P0 | 1 | 🔲 |
| Create organization | P0 | 1 | 🔲 |
| Add payees | P0 | 1 | 🔲 |
| Range compliance check | P0 | 2 | 🔲 |
| Single private payment | P0 | 2 | 🔲 |
| Batch payroll | P0 | 2 | 🔲 |
| Payment history | P1 | 3 | 🔲 |
| Audit dashboard | P1 | 3 | 🔲 |
| Demo polish | P1 | 3 | 🔲 |

### Out of Scope (Post-Hackathon)

- ❌ Multi-sig approvals
- ❌ Recurring payments
- ❌ Multiple treasuries
- ❌ Token-2022 confidential balances
- ❌ On-chain program deployment

---

## 📋 Feature Specifications

### 1. Organization Setup

**User Story:** As an organization admin, I want to create my organization so I can start paying my team privately.

**Flow:**
```
1. Connect wallet (Phantom/Backpack/Solflare)
2. Click "Create Organization"
3. Enter organization name
4. Organization created with wallet as admin
```

**Data Model:**
```typescript
interface Organization {
  id: string;
  name: string;
  adminWallet: string;
  createdAt: Date;
}
```

**UI:**
- Hero section with value prop
- "Connect Wallet" button
- Organization creation modal
- Dashboard redirect after creation

---

### 2. Payee Management

**User Story:** As an admin, I want to add team members so I can pay them privately.

**Flow:**
```
1. Click "Add Payee"
2. Enter payee details (name, email, wallet)
3. System generates Privacy Cash deposit address
4. Range pre-screens the wallet address
5. Payee added to organization
```

**Data Model:**
```typescript
interface Payee {
  id: string;
  orgId: string;
  name: string;
  email: string;
  walletAddress: string;
  privacyCashAddress?: string;  // Generated stealth address
  rangeStatus: 'pending' | 'approved' | 'flagged';
  createdAt: Date;
}
```

**UI:**
- Payee list table
- "Add Payee" button
- Add payee form (name, email, wallet)
- Compliance status badge per payee

---

### 3. Range Compliance Check

**User Story:** As an admin, I want to ensure payees pass compliance checks before I can pay them.

**Flow:**
```
1. When payee added, call Range API
2. Range checks wallet against:
   - Sanctions lists
   - Known bad actors
   - Risk scoring
3. Return approval status
4. Display status in UI
```

**Integration:**
```typescript
// Range compliance check
async function checkCompliance(walletAddress: string): Promise<ComplianceResult> {
  const response = await rangeAPI.screen({
    address: walletAddress,
    chain: 'solana',
    checkTypes: ['sanctions', 'risk']
  });
  
  return {
    approved: response.risk_score < 0.7,
    riskScore: response.risk_score,
    flags: response.flags
  };
}
```

**UI:**
- Green checkmark = approved
- Yellow warning = review needed
- Red X = blocked

---

### 4. Private Payment Execution

**User Story:** As an admin, I want to pay a team member privately so their salary isn't visible on-chain.

**Flow:**
```
1. Select payee from list
2. Enter amount (SOL)
3. Click "Pay Privately"
4. System executes via Privacy Cash SDK:
   a. Deposit SOL to privacy pool
   b. Generate proof
   c. Withdraw to payee's stealth address
5. Payment confirmed
```

**Integration:**
```typescript
// Privacy Cash payment
async function executePrivatePayment(
  sender: Keypair,
  recipientWallet: string,
  amount: number
): Promise<PaymentResult> {
  // Initialize Privacy Cash
  const privacyCash = new PrivacyCashSDK({
    connection: heliusConnection,
    wallet: sender
  });
  
  // Execute private transfer
  const result = await privacyCash.privateTransfer({
    recipient: recipientWallet,
    amount: amount * LAMPORTS_PER_SOL,
    token: 'SOL'
  });
  
  return {
    success: true,
    txSignature: result.signature,
    stealthAddress: result.stealthAddress
  };
}
```

**UI:**
- Payment modal
- Amount input
- "Pay Privately" button
- Transaction confirmation
- Success/error toast

---

### 5. Batch Payroll

**User Story:** As an admin, I want to pay multiple team members at once so I can run payroll efficiently.

**Flow:**
```
1. Click "Run Payroll"
2. Select payees to include
3. Enter amounts for each
4. Review total
5. Click "Execute Batch"
6. System processes payments sequentially
7. Show progress and results
```

**UI:**
- Payroll modal with payee list
- Amount inputs per payee
- Total calculation
- Progress indicator
- Results summary

---

### 6. Audit Dashboard

**User Story:** As an auditor, I want to view payment history with selective disclosure so I can verify compliance.

**Flow:**
```
1. Admin shares audit link with auditor
2. Auditor views payment history
3. Details are disclosed based on Range selective disclosure
4. Auditor can verify payments occurred
```

**Integration:**
```typescript
// Range selective disclosure
async function generateAuditView(
  orgId: string,
  auditorKey: string
): Promise<AuditReport> {
  const payments = await getOrgPayments(orgId);
  
  // Use Range to create selective disclosure
  const disclosedPayments = await rangeAPI.selectiveDisclose({
    data: payments,
    viewerKey: auditorKey,
    disclosureLevel: 'audit'  // Shows amounts but hides recipients
  });
  
  return disclosedPayments;
}
```

**UI:**
- Payment history table
- Date, amount, status columns
- Recipient shown as "Private" or partial address
- Export to CSV

---

## 🛠️ Technical Stack

### Frontend
```json
{
  "framework": "Next.js 14",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "wallet": "@solana/wallet-adapter-react",
  "state": "Zustand",
  "forms": "React Hook Form"
}
```

### Backend
```json
{
  "runtime": "Node.js",
  "framework": "Next.js API Routes",
  "database": "SQLite (dev) / Postgres (prod)",
  "orm": "Prisma"
}
```

### Blockchain
```json
{
  "network": "Solana Mainnet",
  "rpc": "Helius",
  "privacy": "Privacy Cash SDK",
  "compliance": "Range API"
}
```

---

## 📁 Project Structure

```
vaultpay/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Main dashboard
│   │   ├── payees/
│   │   │   └── page.tsx          # Payee management
│   │   ├── payroll/
│   │   │   └── page.tsx          # Payroll execution
│   │   └── audit/
│   │       └── page.tsx          # Audit view
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── wallet/
│   │   │   └── WalletButton.tsx
│   │   ├── payee/
│   │   │   ├── PayeeList.tsx
│   │   │   ├── PayeeForm.tsx
│   │   │   └── ComplianceBadge.tsx
│   │   ├── payment/
│   │   │   ├── PaymentModal.tsx
│   │   │   ├── BatchPayroll.tsx
│   │   │   └── PaymentHistory.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Input.tsx
│   │       └── Toast.tsx
│   ├── lib/
│   │   ├── solana/
│   │   │   ├── connection.ts     # Helius connection
│   │   │   └── wallet.ts         # Wallet utilities
│   │   ├── privacy-cash/
│   │   │   ├── client.ts         # Privacy Cash SDK wrapper
│   │   │   └── types.ts
│   │   ├── range/
│   │   │   ├── client.ts         # Range API client
│   │   │   └── types.ts
│   │   └── db/
│   │       ├── prisma.ts
│   │       └── queries.ts
│   ├── hooks/
│   │   ├── useOrganization.ts
│   │   ├── usePayees.ts
│   │   └── usePayments.ts
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── public/
│   └── logo.svg
├── .env.example
├── package.json
└── README.md
```

---

## 🗄️ Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  adminWallet String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  payees      Payee[]
  payments    Payment[]
}

model Payee {
  id                 String   @id @default(cuid())
  orgId              String
  name               String
  email              String
  walletAddress      String
  privacyCashAddress String?
  rangeStatus        String   @default("pending")
  rangeRiskScore     Float?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  organization Organization @relation(fields: [orgId], references: [id])
  payments     Payment[]
  
  @@unique([orgId, email])
}

model Payment {
  id              String   @id @default(cuid())
  orgId           String
  payeeId         String
  amount          Float
  token           String   @default("SOL")
  status          String   @default("pending")
  txSignature     String?
  stealthAddress  String?
  createdAt       DateTime @default(now())
  executedAt      DateTime?
  
  organization Organization @relation(fields: [orgId], references: [id])
  payee        Payee        @relation(fields: [payeeId], references: [id])
}
```

---

## 🔑 Environment Variables

```bash
# .env.example

# Helius
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Range
RANGE_API_KEY=your_range_api_key
RANGE_API_URL=https://api.range.org/v1

# Privacy Cash
NEXT_PUBLIC_PRIVACY_CASH_PROGRAM_ID=9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD

# Database
DATABASE_URL="file:./dev.db"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📅 3-Day Build Schedule

### Day 1: Foundation (8 hours)

| Time | Task | Deliverable |
|------|------|-------------|
| 0-2h | Project setup | Next.js + Tailwind + Prisma |
| 2-3h | Wallet integration | Connect wallet button working |
| 3-5h | Organization CRUD | Create/view organization |
| 5-7h | Payee management | Add/list payees |
| 7-8h | Basic UI polish | Navigation, layout |

**Day 1 Checkpoint:** Can create org, add payees, see list

### Day 2: Core Privacy Features (8 hours)

| Time | Task | Deliverable |
|------|------|-------------|
| 0-2h | Helius connection | RPC working, balance display |
| 2-4h | Range integration | Compliance check on payee add |
| 4-6h | Privacy Cash integration | Single payment working |
| 6-8h | Batch payroll | Multi-payment execution |

**Day 2 Checkpoint:** Can execute private payments with compliance

### Day 3: Polish & Demo (8 hours)

| Time | Task | Deliverable |
|------|------|-------------|
| 0-2h | Payment history | View past payments |
| 2-4h | Audit dashboard | Basic audit view |
| 4-5h | Error handling | Loading states, error messages |
| 5-6h | UI polish | Animations, responsive |
| 6-7h | Testing | End-to-end flow test |
| 7-8h | Demo video | 3-minute walkthrough |

**Day 3 Checkpoint:** Demo-ready application

---

## 🎬 Demo Script (3 minutes)

### Scene 1: The Problem (30 sec)
> "Every DAO payment is public. When you pay your team, competitors see your burn rate, salary structure, and who's working for you. Privacy Cash showed there's $121M of demand for private transfers. But businesses need compliance too."

### Scene 2: The Solution (30 sec)
> "VaultPay is compliant private payroll for Solana. Pay your team without exposing salaries—while staying compliant with regulations. Built on Privacy Cash for privacy, Range for compliance, and Helius for speed."

### Scene 3: Demo Walkthrough (90 sec)
1. Connect wallet
2. Create organization "Acme DAO"
3. Add payee with wallet address
4. Show Range compliance check passing
5. Execute private payment
6. Show payment confirmed but recipient address hidden
7. Show audit view with selective disclosure

### Scene 4: Business Model (15 sec)
> "VaultPay charges 0.1% per payment—50x cheaper than traditional payroll. Target: DAOs, crypto companies, and institutions."

### Scene 5: Call to Action (15 sec)
> "VaultPay: Private payroll that's actually compliant. Try it now at vaultpay.xyz"

---

## ✅ Submission Checklist

### Bounty Requirements

**Privacy Cash ($6K)**
- [ ] Uses Privacy Cash SDK
- [ ] Builds privacy-enabled app
- [ ] Integration documented

**Range ($1.5K+)**
- [ ] Uses Range pre-screening
- [ ] Implements selective disclosure
- [ ] Meets compliance requirements

**Helius ($5K)**
- [ ] Uses Helius RPCs
- [ ] Leverages developer tooling
- [ ] Best privacy project on their infra

### Deliverables

- [ ] Working demo (live URL or video)
- [ ] GitHub repository (public)
- [ ] README with setup instructions
- [ ] Demo video (3 minutes max)
- [ ] Pitch deck (5-10 slides)

---

## 🚀 Post-Hackathon Roadmap

### Week 1-2: Production Hardening
- Multi-sig wallet support
- Production database (Postgres)
- Security audit

### Week 3-4: Feature Expansion
- Recurring payments
- Multiple tokens (USDC, USDT)
- Token-2022 confidential balances

### Month 2: Launch
- Public beta
- First paying customers
- Partnership announcements

---

*Good luck! Build fast, demo well, win bounties! 🏆*
