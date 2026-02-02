<div align="center">

<img src="svp/public/icons/icon-192.png" alt="VaultPay" width="80" />

# VaultPay

### 🔐 Private Payroll Infrastructure for Solana

**Pay your team without exposing salaries on-chain.**

<br />

[![Live Demo](https://img.shields.io/badge/🚀_Try_Demo-solanavaultpay.vercel.app-9333EA?style=for-the-badge&logoColor=white)](https://solanavaultpay.vercel.app)
[![Watch Video](https://img.shields.io/badge/▶️_Watch_Demo-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://solanavaultpay.vercel.app)

<br />

[![Solana](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=white)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.30-coral?logo=anchor&logoColor=white)](https://anchor-lang.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue)](LICENSE)
[![Devnet](https://img.shields.io/badge/Status-100%25_Devnet_Ready-22C55E)]()

<br />

[**🚀 Demo**](https://solanavaultpay.vercel.app) · [**📖 Technical Spec**](VaultPay-Technical-Specification.md) · [**🏗️ Architecture**](svp/PRIVACY-ARCHITECTURE.md) · [**🗺️ Roadmap**](svp/ROADMAP.md)

</div>

---

## 🔥 The Problem

> **$2.3 trillion** in annual payroll runs on-chain with **zero privacy**.

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

**Problems:**
- 🔍 Salaries visible to **competitors**
- 📊 Burn rate exposed publicly
- ⚖️ GDPR/CCPA violations
- 😞 Employee dissatisfaction

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

**Solution:**
- 🔐 Amounts **encrypted** (ElGamal + ZK)
- 👤 Only sender & recipient see amounts
- ✅ Regulatory compliant
- 🛡️ Automatic OFAC screening

</td>
</tr>
</table>

---

## 🏗️ How It Works

VaultPay implements **two layers of privacy** that work together:

```
                              VAULTPAY PRIVACY PIPELINE
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                                                                             │
   │    PAYER                                                          PAYEE     │
   │   ┌─────┐                                                       ┌─────┐    │
   │   │ 👤  │                                                       │ 👤  │    │
   │   └──┬──┘                                                       └──▲──┘    │
   │      │                                                             │        │
   │      ▼                                                             │        │
   │   ┌─────────┐    ┌──────────────┐    ┌───────────┐    ┌────────────┴───┐   │
   │   │ BUILD   │───▶│   ENCRYPT    │───▶│  SCREEN   │───▶│   CO-SIGN &    │   │
   │   │   TX    │    │  (ElGamal)   │    │  (Range)  │    │    SUBMIT      │   │
   │   └─────────┘    └──────────────┘    └───────────┘    └────────────────┘   │
   │                         │                  │                  │             │
   │                         ▼                  ▼                  ▼             │
   │                  ┌────────────┐     ┌────────────┐     ┌────────────┐       │
   │                  │ Bulletproof│     │   OFAC &   │     │  Arcium    │       │
   │                  │  ZK Proofs │     │ Sanctions  │     │ MPC 2-of-2 │       │
   │                  └────────────┘     └────────────┘     └────────────┘       │
   │                                                                             │
   │   ═══════════════════════════════════════════════════════════════════════   │
   │   📜 ON-CHAIN: Only encrypted ciphertext — amounts NEVER visible            │
   │   ═══════════════════════════════════════════════════════════════════════   │
   │                                                                             │
   └─────────────────────────────────────────────────────────────────────────────┘
```

### Privacy Layers Explained

| Layer | Technology | Purpose | Implementation |
|:-----:|:-----------|:--------|:---------------|
| **1** | **Token-2022 Confidential Transfers** | Hide amounts on-chain | Twisted ElGamal encryption + Bulletproof ZK range proofs |
| **2** | **Arcium MPC Co-Signer** | Enforce compliance before payment | 2-of-2 multisig that only signs after Range OFAC check passes |

> 💡 **Why two layers?** Token-2022 encrypts the amounts, but Arcium ensures bad actors can't use the privacy for illicit purposes. Both must pass for payment to succeed.

---

## ⚡ Features

<table>
<tr>
<td>

### 🔐 Core Privacy
| Feature | Status |
|:--------|:------:|
| ElGamal encrypted amounts | ✅ |
| Bulletproof ZK range proofs | ✅ |
| Arcium MPC co-signing | ✅ |
| Range OFAC screening | ✅ |

</td>
<td>

### 📊 Dashboard
| Feature | Status |
|:--------|:------:|
| Payee management | ✅ |
| Payment history | ✅ |
| Batch payroll | ✅ |
| Organization settings | ✅ |

</td>
<td>

### 🔗 Integrations
| Feature | Status |
|:--------|:------:|
| Squads multi-sig | ✅ |
| Phantom/Solflare/Backpack | ✅ |
| Helius RPC | ✅ |
| Mobile responsive | ✅ |

</td>
</tr>
</table>

### ✨ UI Highlights

- **Privacy Shield Animation** — Visual feedback showing ZK proof → Encryption → Compliance flow
- **One-Click Payroll** — Configure once, pay your whole team with a single click
- **Real-time Status** — Watch your encrypted transaction propagate through the network

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

### Application
| Layer | Technology |
|:------|:-----------|
| **Frontend** | Next.js 14, React 18, TailwindCSS |
| **Backend** | Next.js API Routes, tRPC |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Wallet-based (SIWS) |

</td>
<td width="50%">

### Blockchain
| Layer | Technology |
|:------|:-----------|
| **Network** | Solana (Devnet → Mainnet) |
| **Programs** | Anchor 0.30, Token-2022 |
| **Privacy** | ElGamal, Bulletproofs, Arcium MPC |
| **Compliance** | Range Protocol |

</td>
</tr>
</table>

### 🤝 Infrastructure Partners

<div align="center">

| [![Arcium](https://img.shields.io/badge/Arcium-MPC_Encryption-8B5CF6?style=for-the-badge&logoColor=white)](https://arcium.com) | [![Range](https://img.shields.io/badge/Range-OFAC_Compliance-22C55E?style=for-the-badge&logoColor=white)](https://range.org) | [![Squads](https://img.shields.io/badge/Squads-Multi--sig-EAB308?style=for-the-badge&logoColor=white)](https://squads.so) | [![Helius](https://img.shields.io/badge/Helius-RPC-F97316?style=for-the-badge&logoColor=white)](https://helius.dev) |
|:---:|:---:|:---:|:---:|
| MPC Co-Signer | Sanctions Screening | Treasury Controls | SOC 2 RPC |

</div>

---

## 🚀 Quick Start

```bash
# Clone & install
git clone https://github.com/YOUR_USERNAME/vaultpay.git && cd vaultpay/svp
npm install

# Configure environment
cp .env .env.local
# Edit .env.local with your DATABASE_URL and AUTH_JWT_SECRET

# Run
npm run db:push && npm run dev
```

> 🌐 Open [localhost:3000](http://localhost:3000) and connect your wallet!

<details>
<summary><b>📋 Environment Variables Reference</b></summary>

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `DATABASE_URL` | 🔴 Yes | PostgreSQL connection string (Supabase) |
| `AUTH_JWT_SECRET` | 🔴 Yes | 64-char hex: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | 🟢 Pre-set | `devnet` (change to `mainnet-beta` for production) |
| `NEXT_PUBLIC_VAULTPAY_PROGRAM_ID` | 🟢 Pre-set | `ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ` |
| `NEXT_PUBLIC_CONFIDENTIAL_MINT` | 🟢 Pre-set | `Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo` |
| `NEXT_PUBLIC_HELIUS_API_KEY` | 🟡 Optional | [helius.dev](https://dev.helius.xyz) — improves RPC reliability |
| `RANGE_API_KEY` | 🟡 Optional | [range.org](https://range.org) — enables OFAC screening |

</details>

---

## 📁 Project Structure

```
vaultpay/
├── 📄 README.md                           # You are here
├── 📄 VaultPay-Technical-Specification.md # Full technical documentation
│
└── 📦 svp/                                # Main Application
    ├── 📂 src/
    │   ├── 📂 app/                        # Next.js App Router
    │   │   ├── 📂 api/payments/           # REST API endpoints
    │   │   ├── 📂 dashboard/              # Main dashboard
    │   │   ├── 📂 payroll/                # Execute payments
    │   │   └── 📂 audit/                  # Audit interface
    │   │
    │   ├── 📂 components/
    │   │   ├── 📂 privacy/                # CT setup, privacy badges
    │   │   ├── 📂 payment/                # Payment modals & flows
    │   │   └── 📂 wallet/                 # Wallet connection UI
    │   │
    │   ├── 📂 hooks/
    │   │   ├── useConfidentialPayment.ts  # Token-2022 CT hook
    │   │   └── useCoSignedPayment.ts      # Arcium MPC hook
    │   │
    │   └── 📂 lib/
    │       ├── 📂 arcium/                 # MPC client SDK
    │       ├── 📂 confidential/           # Token-2022 bridge
    │       ├── 📂 cosigner/               # Co-signer service
    │       └── 📂 range/                  # Compliance API
    │
    ├── 📂 prisma/                         # Database schema
    │
    └── 📂 vaultpay_confidential/          # 🦀 Anchor/Arcium Program
        ├── 📂 programs/                   # Rust smart contracts
        ├── 📂 encrypted-ixs/              # Encrypted instruction handlers
        └── 📂 tests/                      # Integration tests
```

---

## 🔐 Deployed Infrastructure (Devnet)

> All contracts are deployed and verified on Solana Devnet

| Component | Address | Explorer |
|:----------|:--------|:---------|
| **VaultPay Program** | `ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ` | [View ↗](https://solscan.io/account/ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ?cluster=devnet) |
| **Arcium MXE** | `13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk` | [View ↗](https://solscan.io/account/13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk?cluster=devnet) |
| **Arcium Cluster** | `945zoPijX8CA5c8dquvkq4ndqDWpPXGHekmVDjoDx26H` | [View ↗](https://solscan.io/account/945zoPijX8CA5c8dquvkq4ndqDWpPXGHekmVDjoDx26H?cluster=devnet) |
| **Confidential Mint** | `Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo` | [View ↗](https://solscan.io/token/Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo?cluster=devnet) |

---

## 🧪 Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

<details>
<summary><b>🔬 Test Coverage Areas</b></summary>

- **Unit Tests:** Encryption utilities, ZK proof generation, compliance checks
- **Integration Tests:** End-to-end payment flows, wallet interactions
- **Smart Contract Tests:** Anchor program tests in `vaultpay_confidential/tests/`

</details>

---

## 📦 Deployment

<table>
<tr>
<td width="50%">

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

</td>
<td width="50%">

### Docker / Railway

```bash
docker build -t vaultpay .
docker run -p 3000:3000 \
  --env-file .env vaultpay
```

</td>
</tr>
</table>

---

## 🗺️ Roadmap

| Phase | Status | Milestone | Details |
|:------|:------:|:----------|:--------|
| **Phase 1** | ✅ Complete | Core Infrastructure | Wallet auth, payee CRUD, encrypted payments |
| **Phase 2** | ✅ Complete | Token-2022 CT | Confidential mint, ZK proofs, CLI bridge |
| **Phase 3** | ✅ Complete | Production Ready | Arcium MPC co-signer, compliance, animations |
| **Phase 4** | 🔄 In Progress | Mainnet Launch | Security audit, mainnet deployment, stablecoin support |

<details>
<summary><b>🎯 Phase 4 Checklist</b></summary>

- [ ] Professional security audit (Halborn/OtterSec)
- [ ] Mainnet program deployment
- [ ] USDC confidential mint integration
- [ ] Production compliance pipeline
- [ ] Enterprise dashboard features

</details>

> 📖 See [full roadmap](svp/ROADMAP.md) for complete details

---

## 🔗 Resources

<div align="center">

| | | | |
|:---:|:---:|:---:|:---:|
| [🚀 **Live Demo**](https://solanavaultpay.vercel.app) | [📖 **Technical Spec**](VaultPay-Technical-Specification.md) | [🏗️ **Architecture**](svp/PRIVACY-ARCHITECTURE.md) | [🗺️ **Roadmap**](svp/ROADMAP.md) |

</div>

---

## 🤝 Contributing

We welcome contributions! Please see our workflow:

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/vaultpay.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes & test
npm test

# 4. Commit & push
git commit -m "feat: Add amazing feature"
git push origin feature/amazing-feature

# 5. Open Pull Request
```

> 💡 **Tip:** Check out [good first issues](https://github.com/YOUR_USERNAME/vaultpay/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) to get started!

---

## 📄 License

This project is licensed under the [GNU General Public License v3.0](LICENSE) (required due to Arcium MPC dependency).

---

<div align="center">

### 🏆 Built for the Solana Ecosystem

<br />

[![Arcium](https://img.shields.io/badge/Powered_by-Arcium_MPC-8B5CF6?style=for-the-badge&logoColor=white)](https://arcium.com)
[![Range](https://img.shields.io/badge/Secured_by-Range_Compliance-22C55E?style=for-the-badge&logoColor=white)](https://range.org)
[![Squads](https://img.shields.io/badge/Protected_by-Squads_Multisig-EAB308?style=for-the-badge&logoColor=white)](https://squads.so)
[![Helius](https://img.shields.io/badge/Accelerated_by-Helius_RPC-F97316?style=for-the-badge&logoColor=white)](https://helius.dev)

<br />

---

<img src="svp/public/icons/icon-192.png" alt="VaultPay" width="48" />

### **VaultPay**
*Private Payroll for the Open Economy*

<br />

<sub>Made with 💜 by the VaultPay Team</sub>

<br />

[![Twitter](https://img.shields.io/badge/Twitter-@VaultPay-1DA1F2?style=flat-square&logo=twitter&logoColor=white)](https://twitter.com/vaultpay)
[![Discord](https://img.shields.io/badge/Discord-Join_Us-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/vaultpay)

</div>
