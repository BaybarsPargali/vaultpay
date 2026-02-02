<div align="center">

# 🔐 VaultPay

### Private Payroll Infrastructure for Solana

**Pay your team without exposing salaries on-chain.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-vaultpay.vercel.app-purple?style=for-the-badge)](https://vaultpay.vercel.app)

[![Solana](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=white)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue)](LICENSE)
[![Devnet Ready](https://img.shields.io/badge/Status-100%25_Devnet_Ready-success)]()

<br />

[**Demo**](https://vaultpay.vercel.app) · [**Technical Spec**](VaultPay-Technical-Specification.md) · [**Architecture**](svp/PRIVACY-ARCHITECTURE.md) · [**Roadmap**](svp/ROADMAP.md)

</div>

---

## 🔥 Why VaultPay?

<table>
<tr>
<td width="50%">

### ❌ Traditional On-Chain Payroll

```
Explorer shows:
├── Wallet A → 5,000 USDC → Employee 1
├── Wallet A → 8,500 USDC → Employee 2  
├── Wallet A → 12,000 USDC → Employee 3
└── Everyone knows everyone's salary 😱
```

- Salaries visible to **anyone**
- Competitors see your burn rate
- Violates employee privacy
- GDPR/compliance nightmare

</td>
<td width="50%">

### ✅ VaultPay Private Payroll

```
Explorer shows:
├── Wallet A → [encrypted] → Employee 1
├── Wallet A → [encrypted] → Employee 2
├── Wallet A → [encrypted] → Employee 3
└── Only ciphertext on-chain 🔐
```

- Amounts **encrypted** (ElGamal + ZK proofs)
- Only sender & recipient know the amount
- Compliant with privacy regulations
- Automatic OFAC screening

</td>
</tr>
</table>

---

## 🏗️ Dual Privacy Architecture

VaultPay implements **two layers of privacy** that work together:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VAULTPAY PRIVACY FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────────┐    │
│   │  Build   │───▶│  ZK Proofs   │───▶│ Compliance│───▶│   Co-Sign    │    │
│   │    TX    │    │ (Bulletproof)│    │  (Range)  │    │(Arcium MPC)  │    │
│   └──────────┘    └──────────────┘    └───────────┘    └──────────────┘    │
│        │                 │                  │                  │            │
│        ▼                 ▼                  ▼                  ▼            │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │              ON-CHAIN: Only encrypted ciphertext                  │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | What It Does |
|:-----:|:-----------|:-------------|
| **Layer 1** | **Token-2022 Confidential Transfers** | Amounts encrypted with Twisted ElGamal + Bulletproof ZK proofs |
| **Layer 2** | **Arcium MPC Co-Signer** | 2-of-2 multisig that only signs after compliance passes |

---

## ⚡ Features

| Feature | Description | Status |
|:--------|:------------|:------:|
| 🔐 **Encrypted Payments** | ElGamal encryption with ZK proofs - amounts never visible | ✅ |
| 🛡️ **Compliance Co-Signer** | Arcium MPC gates payments through Range OFAC screening | ✅ |
| 📊 **Dashboard** | Full payee management, payment history, organization settings | ✅ |
| 🔑 **Wallet Auth** | Sign-in with Phantom, Solflare, or Backpack | ✅ |
| 👥 **Squads Multi-sig** | Enterprise treasury controls | ✅ |
| 📱 **Mobile Ready** | Responsive design with PWA support | ✅ |
| 🎨 **Privacy Shield Animation** | Visual feedback: ZK → Encryption → Compliance | ✅ |
| 📈 **Audit Trail** | Encrypted logs for authorized auditors | ✅ |

---

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | Next.js 14, React 18, TailwindCSS |
| **Blockchain** | Solana, Anchor Framework, Token-2022 |
| **Privacy** | Arcium MPC, Twisted ElGamal, Bulletproofs |
| **Compliance** | Range Protocol (OFAC/sanctions) |
| **Database** | PostgreSQL (Supabase) |
| **Infrastructure** | Helius RPC, Squads Multi-sig |

### Infrastructure Partners

| Partner | Role |
|:--------|:-----|
| **[Arcium](https://arcium.com)** | MPC encryption & co-signer |
| **[Range](https://range.org)** | Real-time OFAC/sanctions screening |
| **[Squads](https://squads.so)** | Enterprise treasury controls |
| **[Helius](https://helius.dev)** | SOC 2 certified RPC |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥20.18.0
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/vaultpay.git
cd vaultpay/svp

# Install dependencies
npm install

# Set up environment (edit with your keys)
cp .env .env.local

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### Environment Variables

```env
# 🔴 Required
DATABASE_URL="postgresql://..."        # Supabase connection string
AUTH_JWT_SECRET="generate-random-64"   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 🟢 Pre-configured (Devnet) - No changes needed
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_VAULTPAY_PROGRAM_ID="ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ"
NEXT_PUBLIC_CONFIDENTIAL_MINT="Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo"

# 🟡 Optional (enhances functionality)
NEXT_PUBLIC_HELIUS_API_KEY=""          # https://dev.helius.xyz
RANGE_API_KEY=""                        # https://range.org
```

---

## 📁 Project Structure

```
vaultpay/
├── svp/                              # 📦 Main Next.js Application
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── api/payments/         #   └── Payment API endpoints
│   │   │   ├── dashboard/            #   └── Dashboard page
│   │   │   └── payroll/              #   └── Execute payments
│   │   ├── components/               # React Components
│   │   │   ├── privacy/              #   └── CT Setup, Privacy badges
│   │   │   └── payment/              #   └── Payment modals
│   │   ├── hooks/                    # React Hooks
│   │   │   ├── useConfidentialPayment.ts
│   │   │   └── useCoSignedPayment.ts
│   │   └── lib/                      # Core Libraries
│   │       ├── arcium/               #   └── MPC program client
│   │       ├── confidential/         #   └── Token-2022 CT bridge
│   │       ├── cosigner/             #   └── Co-signer implementation
│   │       └── range/                #   └── Compliance client
│   ├── prisma/                       # Database Schema
│   └── vaultpay_confidential/        # 🦀 Anchor/Arcium Program
├── VaultPay-Technical-Specification.md
└── README.md
```

---

## 🔐 Deployed Infrastructure (Devnet)

| Component | Address |
|:----------|:--------|
| **VaultPay Program** | `ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ` |
| **Arcium MXE** | `13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk` |
| **Arcium Cluster** | `945zoPijX8CA5c8dquvkq4ndqDWpPXGHekmVDjoDx26H` |
| **Confidential Mint (VPAY)** | `Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo` |

---

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

---

## 📦 Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Railway / Docker

```bash
docker build -t vaultpay .
docker run -p 3000:3000 --env-file .env vaultpay
```

---

## 🗺️ Roadmap

| Phase | Status | Features |
|:------|:------:|:---------|
| **Phase 1: Core** | ✅ | Wallet auth, payee management, encrypted payments |
| **Phase 2: Token-2022 CT** | ✅ | Confidential mint, ZK proofs, CLI bridge |
| **Phase 3: Production** | ✅ | Co-signer, rate limiting, privacy animations |
| **Phase 4: Mainnet** | 🔄 | Security audit, mainnet deployment |

See [full roadmap](svp/ROADMAP.md) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

Licensed under [GPL-3.0](LICENSE) (due to Arcium MPC dependency).

---

## 🔗 Links

| Resource | Link |
|:---------|:-----|
| 🌐 **Live Demo** | [vaultpay.vercel.app](https://vaultpay.vercel.app) |
| 📖 **Technical Spec** | [VaultPay-Technical-Specification.md](VaultPay-Technical-Specification.md) |
| 🏗️ **Architecture** | [PRIVACY-ARCHITECTURE.md](svp/PRIVACY-ARCHITECTURE.md) |
| 🗺️ **Roadmap** | [ROADMAP.md](svp/ROADMAP.md) |

---

<div align="center">

### Built with support from

[![Arcium](https://img.shields.io/badge/Arcium-MPC-8B5CF6?style=flat-square)](https://arcium.com)
[![Range](https://img.shields.io/badge/Range-Compliance-22C55E?style=flat-square)](https://range.org)
[![Squads](https://img.shields.io/badge/Squads-Multi--sig-EAB308?style=flat-square)](https://squads.so)
[![Helius](https://img.shields.io/badge/Helius-RPC-F97316?style=flat-square)](https://helius.dev)

<br />

**VaultPay** — Private Payroll for the Open Economy

<sub>Made with 💜 for the Solana ecosystem</sub>

</div>
