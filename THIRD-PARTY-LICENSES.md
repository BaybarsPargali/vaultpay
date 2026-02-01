# Third-Party Licenses

VaultPay includes third-party open source software. This file summarizes the **direct** dependencies used by the VaultPay application and confidential program.

Notes:
- For complete texts, see each dependency’s `LICENSE` file (typically under `svp/node_modules/<pkg>/LICENSE*`) or the upstream repository.
- License identifiers below are taken from installed dependency metadata and/or bundled LICENSE files in this repository.

## JavaScript/TypeScript (VaultPay app: `svp/`)

### Production dependencies

- `@arcium-hq/client` — GPL-3.0-only
- `@coral-xyz/anchor` — (MIT OR Apache-2.0)
- `@prisma/client` — Apache-2.0 (see `svp/node_modules/@prisma/client/LICENSE`)
- `@solana/spl-token` — Apache-2.0
- `@solana/web3.js` — MIT
- `@solana/wallet-adapter-base` — Apache-2.0
- `@solana/wallet-adapter-react` — Apache-2.0
- `@solana/wallet-adapter-react-ui` — Apache-2.0
- `@solana/wallet-adapter-wallets` — Apache-2.0
- `@sqds/multisig` — MIT
- `axios` — MIT
- `bn.js` — MIT
- `clsx` — MIT
- `cron-parser` — (license text included in package; see `svp/node_modules/cron-parser/LICENSE`)
- `date-fns` — MIT
- `next` — MIT
- `react` — MIT
- `react-dom` — MIT
- `react-hook-form` — MIT
- `react-hot-toast` — MIT
- `zustand` — (license included in package; see `svp/node_modules/zustand/LICENSE`)

### Development dependencies

- `eslint` — MIT
- `eslint-config-next` — MIT (as part of Next.js tooling)
- `prisma` — Apache-2.0
- `tailwindcss` — MIT
- `ts-node` — MIT
- `typescript` — Apache-2.0

## Rust (confidential program: `svp/vaultpay_confidential/`)

### Direct crates

- `anchor-lang` — Apache-2.0 (Anchor)
- `arcium-client` — **GPL-3.0-only** (Arcium)
- `arcium-anchor` — **GPL-3.0-only** (Arcium)
- `arcium-macros` — **GPL-3.0-only** (Arcium)
- `arcis-imports` — **GPL-3.0-only** (Arcium)

### Vendored crates (included in this repository)

- `blake3` — CC0-1.0 OR Apache-2.0 OR Apache-2.0 WITH LLVM-exception
- `constant_time_eq` — CC0-1.0 OR MIT-0 OR Apache-2.0

## Why VaultPay is GPL-3.0-only

VaultPay depends on Arcium components that are licensed **GPL-3.0-only**. Because those dependencies are linked/used as part of the application, VaultPay must be distributed under a GPL-compatible license. VaultPay chooses **GPL-3.0-only**.

## How to verify locally

If you need a full audit (including transitive dependencies), run these locally:

- JS dependency tree (from `svp/`):
	- `npm ls --production`
	- Inspect `node_modules/<pkg>/package.json` (`license`) and `node_modules/<pkg>/LICENSE*`

- Rust crates (from `svp/vaultpay_confidential/`) (requires Rust toolchain):
	- `cargo metadata --format-version 1`
	- Optional: install `cargo-license` and run `cargo license`
