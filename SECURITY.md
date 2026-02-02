# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in VaultPay, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report vulnerabilities by emailing:

📧 **security@vaultpay.io** (or create a private security advisory on GitHub)

### What to Include

Please include the following information in your report:

1. **Description**: A clear description of the vulnerability
2. **Impact**: What an attacker could accomplish by exploiting this issue
3. **Reproduction Steps**: Step-by-step instructions to reproduce the issue
4. **Affected Components**: Which parts of the codebase are affected
5. **Suggested Fix**: If you have one (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

### Scope

The following are in scope for security reports:

- ✅ VaultPay web application (`svp/`)
- ✅ Solana smart contracts (`svp/vaultpay_confidential/`)
- ✅ API endpoints and authentication
- ✅ Cryptographic implementations (ElGamal, MPC integration)
- ✅ Wallet signature verification
- ✅ Payment processing logic

The following are **out of scope**:

- ❌ Third-party dependencies (report to upstream maintainers)
- ❌ Issues in Solana, Arcium, or Range infrastructure
- ❌ Social engineering attacks
- ❌ Denial of service (unless it's a specific vulnerability)

### Safe Harbor

We will not pursue legal action against security researchers who:

- Make a good faith effort to avoid privacy violations and data loss
- Only access data necessary to demonstrate the vulnerability
- Do not exploit vulnerabilities beyond what's needed for proof-of-concept
- Report vulnerabilities promptly and responsibly
- Do not publicly disclose vulnerabilities before they are fixed

### Recognition

We appreciate security researchers and will:

- Acknowledge your contribution (with your permission)
- Keep you informed of our progress
- Credit you in our security advisories (if desired)

### Known Security Considerations

1. **Wallet Signature Authentication**: All API endpoints require valid wallet signatures. Signatures expire after 5 minutes.

2. **MPC Encryption**: Payment amounts are encrypted using Arcium MPC. The encryption keys never leave the secure enclave.

3. **Compliance Screening**: All payees are screened through Range before payments can be processed.

4. **Rate Limiting**: API endpoints implement rate limiting to prevent abuse.

5. **Input Validation**: All inputs are validated using Zod schemas before processing.

## Security Best Practices for Users

1. **Never share your wallet private key or seed phrase**
2. **Always verify the wallet connection prompt** shows the correct domain
3. **Review all transaction details** before signing
4. **Use hardware wallets** for high-value organizations
5. **Enable multi-sig** (Squads) for organization treasuries

---

Thank you for helping keep VaultPay secure! 🔐
