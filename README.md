# VaultPay 🔐

**Private Payroll Infrastructure for Solana**

VaultPay enables organizations to process confidential payroll payments on Solana while maintaining regulatory compliance. Payment amounts are encrypted on-chain using MPC (Multi-Party Computation), ensuring salary privacy while allowing authorized compliance verification.

![Solana](https://img.shields.io/badge/Solana-Devnet-green)
![License](https://img.shields.io/badge/License-Apache%202.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🎯 Problem Statement

Traditional on-chain payments expose sensitive financial data:
- Employee salaries are publicly visible
- Competitive intelligence is leaked
- Privacy regulations (GDPR, etc.) are violated
- Organizations avoid crypto payroll due to transparency

## 💡 Solution

VaultPay combines three privacy-preserving technologies:

| Technology | Purpose | Provider |
|------------|---------|----------|
| **Token-2022 Confidential Transfers** | Encrypted token balances | Solana SPL |
| **Arcium MPC** | Encrypted compliance verification | Arcium Network |
| **Range Protocol** | Real-time sanctions screening | Range |

### How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Employer   │────▶│   VaultPay   │────▶│  Employee   │
│   Wallet    │     │   Program    │     │   Wallet    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  Arcium  │  │  Range   │
              │   MPC    │  │ Compliance│
              └──────────┘  └──────────┘
```

1. **Employer initiates payment** - Amount is encrypted client-side using ElGamal
2. **Arcium MPC verifies** - MPC nodes validate compliance without seeing plaintext
3. **Range screens recipient** - Wallet checked against sanctions lists
4. **Funds released** - Recipient receives funds, amount hidden on-chain

## ✨ Features

- 🔐 **Encrypted Payments** - Salary amounts hidden on-chain
- ✅ **Compliance Built-in** - Automatic sanctions screening via Range
- 🏛️ **Audit Trail** - Encrypted logs for authorized auditors only
- 📊 **Dashboard** - Manage payees, view payment history
- 🔑 **Wallet Auth** - Sign-in with Solana wallet (Phantom, Solflare)
- 📱 **Mobile Ready** - Responsive design for all devices

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TailwindCSS |
| **Blockchain** | Solana, Anchor Framework |
| **Privacy** | Arcium MPC, Token-2022 Confidential Transfers |
| **Compliance** | Range Protocol API |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Wallet signature + JWT |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Solana CLI
- Docker (for local Supabase)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vaultpay.git
cd vaultpay/svp

# Install dependencies
pnpm install

# Copy environment file
cp .env .env.local

# Start local Supabase
docker-compose up -d

# Push database schema
pnpm prisma db push

# Start development server
pnpm dev
```

### Environment Variables

Create `.env.local` with your keys:

```env
# Required
DATABASE_URL="postgresql://postgres:postgres@localhost:54332/postgres"
NEXT_PUBLIC_HELIUS_API_KEY="your-helius-key"

# Optional (for full functionality)
RANGE_API_KEY="your-range-key"
```

Get free API keys:
- **Helius**: https://dev.helius.xyz
- **Range**: https://range.org

## 📁 Project Structure

```
vaultpay/
├── svp/                      # Main Next.js application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Core libraries
│   │   │   ├── arcium/       # Arcium MPC integration
│   │   │   ├── confidential/ # Token-2022 CT bridge
│   │   │   ├── range/        # Compliance screening
│   │   │   └── solana/       # Solana utilities
│   │   └── hooks/            # React hooks
│   ├── prisma/               # Database schema
│   └── vaultpay_confidential/ # Anchor program
├── docs/                     # Technical documentation
└── archive/                  # Hackathon specs
```

## 🔐 Privacy Architecture

### On-Chain Privacy

```
Standard Transfer:    sender → 5 SOL → recipient  (visible)
VaultPay Transfer:    sender → [encrypted] → recipient  (hidden)
```

The encrypted amount is stored as a 32-byte ciphertext using ElGamal encryption. Only parties with the decryption key can view the actual amount.

### Compliance Flow

1. Recipient wallet screened against:
   - OFAC sanctions list
   - Known mixer addresses
   - Darknet market wallets
   
2. MPC cluster verifies:
   - Amount within policy limits
   - Sender authorized
   - No compliance flags

3. Transaction proceeds only if all checks pass

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# E2E tests (requires local setup)
pnpm test:e2e
```

## 📦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
vercel --prod
```

The `vercel.json` at root level configures `svp` as the root directory.

### Environment Variables for Production

Set these in your Vercel dashboard:
- `DATABASE_URL` - Production Supabase connection
- `NEXT_PUBLIC_HELIUS_API_KEY` - Helius RPC key
- `RANGE_API_KEY` - Range compliance API key
- `AUTH_JWT_SECRET` - Random 32+ character string

## 🗺️ Roadmap

- [x] Core payment flow with encryption
- [x] Arcium MPC integration
- [x] Range compliance screening
- [x] Dashboard & payee management
- [ ] Squads multisig integration
- [ ] Recurring payments
- [ ] Batch payroll optimization
- [ ] Mobile app (React Native)
- [ ] Mainnet deployment

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file.

## 🔗 Links

- **Demo**: [vaultpay.vercel.app](https://vaultpay.vercel.app)
- **Docs**: [docs/](./docs/)
- **Arcium**: [arcium.com](https://arcium.com)
- **Range**: [range.org](https://range.org)

## 🙏 Acknowledgments

Built for the [Solana Hackathon 2026](https://solana.com/hackathon) with support from:
- Arcium Network - MPC infrastructure
- Range Protocol - Compliance API
- Helius - RPC infrastructure
- Solana Foundation

---

<p align="center">
  <b>VaultPay</b> - Private Payroll for the Open Economy
</p>
