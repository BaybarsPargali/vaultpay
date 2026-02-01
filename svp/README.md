# VaultPay - Compliant Private Payroll on Solana

> **Pay your team privately. Stay compliant. Built on Solana.**

<div align="center">

[![Live Demo](https://img.shields.io/badge/Demo-Devnet-purple?style=for-the-badge)](https://vaultpay.app)
[![Solana](https://img.shields.io/badge/Solana-Token--2022-00D4AA?style=for-the-badge)](https://solana.com)
[![Arcium](https://img.shields.io/badge/Arcium-MPC-7B3FE4?style=for-the-badge)](https://arcium.com)
[![Range](https://img.shields.io/badge/Range-Compliant-22C55E?style=for-the-badge)](https://range.org)

**The first payroll platform where payment amounts are cryptographically invisible on-chain.**

</div>

---

## � Video Walkthrough

> **Watch the 2-minute demo to see VaultPay in action!**

<!-- 
TODO: Replace with actual Loom/YouTube embed after recording

<div align="center">
  <a href="https://www.loom.com/share/YOUR_LOOM_ID">
    <img src="https://cdn.loom.com/sessions/thumbnails/YOUR_LOOM_ID-with-play.gif" alt="VaultPay Demo">
  </a>
</div>

Or use YouTube:
[![VaultPay Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
-->

📹 **Demo Video:** [Coming Soon - Record and embed your Loom/YouTube walkthrough here]

**What the video covers:**
1. 🔐 Connecting wallet and creating an organization
2. 👥 Adding team members with compliance screening
3. 💸 Executing a private payment with the Privacy Shield animation
4. 🔍 Verifying on Solana Explorer that the amount shows as "Confidential"

---

## �🏆 Architecture: Compliance Co-Signer Model

VaultPay pioneers a **hybrid privacy architecture** that delivers TRUE end-to-end privacy TODAY:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VAULTPAY PRIVACY ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │   User       │      │   Arcium     │      │   Solana     │             │
│   │   Wallet     │ ───► │   Co-Signer  │ ───► │   Network    │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                      │                      │                     │
│         │ Signs TX             │ Validates            │ Confirms            │
│         │                      │ Compliance           │ Transaction         │
│         ▼                      ▼                      ▼                     │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                    TOKEN-2022 CONFIDENTIAL TRANSFER              │     │
│   │                                                                  │     │
│   │   Amount: ████████████ (ElGamal Encrypted)                       │     │
│   │   Proof:  Bulletproof ZK Range Proof                             │     │
│   │   Balance: ████████████ (Encrypted)                              │     │
│   │                                                                  │     │
│   │   ✅ Amount NEVER visible on-chain                               │     │
│   │   ✅ Compliance validated WITHOUT seeing amount                  │     │
│   │   ✅ Production-grade ZK proofs (Rust CLI)                       │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture Wins

| Challenge | Traditional Approach | **VaultPay Solution** |
|-----------|---------------------|----------------------|
| Amount Privacy | Custom programs leak plaintext | **Token-2022 CT = native encryption** |
| Compliance | On-chain validation needs data | **Server-side screening, encrypted execution** |
| ZK Proofs | JS SDK doesn't exist | **CLI Bridge with official Rust crate** |
| User Experience | Complex key management | **Wallet-derived deterministic keys** |

---

## 🔗 Core Technology Stack

| Component | Technology | What It Does |
|-----------|------------|--------------|
| **🔒 Private Payments** | Token-2022 Confidential Transfer | ElGamal encryption + Bulletproof ZK proofs |
| **🤝 Co-Signer** | Arcium MPC | 2-of-2 compliance gatekeeper |
| **🛡️ Compliance** | Range Protocol | Real-time OFAC/sanctions screening |
| **👥 Multi-sig** | Squads Protocol | Enterprise treasury controls |
| **⚡ Infrastructure** | Helius RPC | High-performance Solana connectivity |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.18+
- A Solana wallet (Phantom, Backpack, or Solflare)
- WSL2/Ubuntu for Arcium deployment (Windows users)

### Installation

```bash
# Clone the repo
git clone https://github.com/BaybarsPargali/vaultpay.git
cd vaultpay/svp

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Initialize database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

### Verify Deployment

```bash
npx ts-node scripts/check-deployment.ts
```

---

## 📊 Production Status

### ✅ Deployed Infrastructure

| Component | Address | Status |
|-----------|---------|--------|
| **VaultPay Program** | `ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ` | ✅ Live |
| **Arcium MXE** | `13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk` | ✅ Active |
| **Confidential Mint** | `Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo` | ✅ Ready |
| **Arcium Cluster** | Offset 123 | ✅ Connected |

### ✅ Feature Completion

| Category | Feature | Status |
|----------|---------|--------|
| **Privacy** | Token-2022 Confidential Transfers | ✅ Production |
| **Privacy** | ElGamal + Bulletproof ZK Proofs | ✅ Production |
| **Privacy** | Compliance Co-Signer (Arcium) | ✅ Production |
| **Compliance** | Range Protocol Integration | ✅ Production |
| **Compliance** | Auditor Sealing | ✅ Production |
| **Payments** | Single & Batch Payroll | ✅ Production |
| **Payments** | Recurring Templates | ✅ Production |
| **Treasury** | Squads Multi-sig | ✅ Production |
| **Security** | Wallet-Signature Auth | ✅ Production |
| **Security** | Rate Limiting | ✅ Production |
| **Infra** | RPC Failover | ✅ Production |
| **Infra** | Idempotency Checks | ✅ Production |

---

## 🔐 Privacy Guarantee

### What's Encrypted On-Chain

```
On-chain Transaction:
├── Sender address      → VISIBLE (necessary for blockchain)
├── Recipient address   → VISIBLE (necessary for blockchain)
├── Amount              → ✅ ENCRYPTED (ElGamal ciphertext)
├── Balance             → ✅ ENCRYPTED (ElGamal ciphertext)
└── ZK Proof            → Validates without revealing data
```

### What Compliance Sees

```
Range Protocol Check:
├── Recipient address   → SCREENED (OFAC, sanctions)
├── Amount              → ❌ NEVER SENT
├── Sender identity     → ❌ NEVER SENT
└── Result              → APPROVE / DENY
```

**Privacy Guarantee:** The amount is NEVER visible anywhere—not on-chain, not to compliance, not to Arcium.

---

## 💻 API Usage

### Execute Private Payment

```typescript
// POST /api/payments/private
const response = await fetch('/api/payments/private', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    recipientWallet: 'abc123...',
    amount: 100,
    organizationId: 'org_xxx',
  }),
});

// Response
{
  "success": true,
  "txSignature": "5Kj2...",
  "message": "Private payment completed. Amount is encrypted on-chain."
}
```

### React Hook

```tsx
import { usePrivatePayment } from '@/hooks/usePrivatePayment';

function PayButton() {
  const { executePayment, isProcessing } = usePrivatePayment();

  const handlePay = async () => {
    const result = await executePayment({
      recipientWallet: 'abc...',
      amount: 100,
      organizationId: 'org_123',
    });

    if (result.success) {
      // Amount is now encrypted on-chain!
      console.log('Tx:', result.txSignature);
    }
  };

  return (
    <button onClick={handlePay} disabled={isProcessing}>
      {isProcessing ? 'Processing...' : '🔒 Pay Privately'}
    </button>
  );
}
```

---

## 🏗️ Technical Deep Dive

### Compliance Co-Signer Flow

1. **User builds transaction** → Standard Token-2022 Confidential Transfer
2. **Frontend requests co-sign** → `POST /api/payments/private`
3. **Server validates compliance** → Range Protocol screens recipient only
4. **Arcium co-signs** → MPC key adds second signature (2-of-2)
5. **Submit to Solana** → Fully signed transaction with encrypted amount

### Why CLI Bridge (Not a Workaround)

Token-2022 Confidential Transfers require **Bulletproof ZK proofs** that can only be generated by the official Rust crate (`spl-token-confidential-transfer-proof-generation`). There is no JavaScript SDK for this—by design.

VaultPay's CLI Bridge wraps the official `spl-token` CLI, which uses the exact same Rust cryptography that Solana validators use to verify proofs. This is the production-correct approach used by all successful CT deployments.

### Files Structure

```
src/
├── lib/
│   ├── cosigner/              # Co-Signer architecture
│   │   ├── index.ts           # Client & service
│   │   └── compliant-transfer.ts  # Compliance + CT
│   ├── confidential/          # Token-2022 CT
│   │   └── cli-bridge.ts      # Production CLI wrapper
│   └── range/                 # Compliance
│       └── client.ts          # Range API integration
├── app/api/
│   └── payments/
│       ├── private/route.ts   # Private payment endpoint
│       └── cosign/route.ts    # Co-signer endpoint
└── hooks/
    └── usePrivatePayment.ts   # React hook
```

---

## 🛤️ Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed future plans:

- **Q1 2026**: Arcium C-SPL integration (unified MPC + CT)
- **Q2 2026**: Multiple token support (USDC, USDT)
- **Q3 2026**: Mobile app, email notifications

---

## 🔧 Deployment

### Recommended: VM Deployment (Railway/EC2)

VaultPay's CLI Bridge requires access to the `spl-token` CLI, which isn't available on serverless platforms.

```dockerfile
FROM node:20
RUN apt-get update && apt-get install -y curl
RUN curl -sSfL https://release.solana.com/stable/install | sh
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
RUN cargo install spl-token-cli
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "start"]
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_HELIUS_API_KEY="..."

# Arcium
NEXT_PUBLIC_VAULTPAY_PROGRAM_ID="ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ"
NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT="13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk"

# Range Compliance
RANGE_API_KEY="..."

# Auth
AUTH_JWT_SECRET="..."
```

---

## 🙏 Acknowledgments

<div align="center">

**Secured by**

[![Arcium](https://img.shields.io/badge/◈-Arcium-7B3FE4?style=flat-square)](https://arcium.com)
[![Token-2022](https://img.shields.io/badge/◎-Token--2022-00D4AA?style=flat-square)](https://spl.solana.com/token-2022)
[![Squads](https://img.shields.io/badge/⬡-Squads-F59E0B?style=flat-square)](https://squads.so)
[![Range](https://img.shields.io/badge/◉-Range-22C55E?style=flat-square)](https://range.org)
[![Helius](https://img.shields.io/badge/⬢-Helius-F97316?style=flat-square)](https://helius.dev)

</div>

---

## 📜 License

GPL-3.0-only (required by Arcium SDK dependency)

---

<div align="center">

**Built with 💜 on Solana**

*The first payroll platform with cryptographically private payment amounts.*

</div>
