# Range API Documentation

> **Comprehensive reference for Range's blockchain risk, data, and compliance APIs**
> 
> Enterprise-grade risk, compliance, and intelligence for digital assets. Trusted by industry leaders managing $35B+ in crypto including Circle, Solana Foundation, Stellar, Squads, dYdX, Jupiter, and Decaf.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Data API](#data-api)
5. [Risk API](#risk-api)
6. [Faraday API](#faraday-api)
7. [Supported Networks](#supported-networks)
8. [TypeScript Types & Interfaces](#typescript-types--interfaces)
9. [Error Handling](#error-handling)
10. [Rate Limits & Pricing](#rate-limits--pricing)

---

## Overview

Range is the industry's most comprehensive blockchain risk and intelligence platform, delivering real-time security, sanctions compliance, cross-chain monitoring, and forensic capabilities purpose-built for institutional digital asset operations.

### Platform Pillars

| API | Description |
|-----|-------------|
| **Data API** | Unified blockchain data, protocol analytics, and deep stablecoin intelligence |
| **Risk API** | Score wallets, transactions, tokens, and smart contracts using sanctions checks, behavioral analytics, and ML models |
| **Faraday API** | Execute cross-chain stablecoin transfers with best-price routing, integrated compliance screening, and automated Travel Rule record keeping |

### Key Capabilities

- Screen wallets and assess risk exposure in real-time
- Ensure comprehensive sanctions compliance across all chains
- Monitor stablecoin flows and treasury movements as they happen
- Execute cross-chain transfers with integrated compliance workflows

---

## Authentication

All Range API endpoints require authentication using an API key.

### Getting an API Key

1. Sign up at [app.range.org](https://app.range.org)
2. Generate your API key in the dashboard
3. Contact [email protected] for enterprise access

### Authentication Methods

#### Method 1: X-API-KEY Header (Recommended for Risk/Data APIs)

```bash
curl --location 'https://api.range.org/v1/address/YOUR_ADDRESS/transactions' \
  --header 'X-API-KEY: <YOUR_API_KEY>'
```

#### Method 2: Authorization Bearer Token (Alternative)

```bash
curl -X GET "https://api.range.org/v1/address?address=YOUR_ADDRESS&network=solana" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Method 3: SDK Initialization (Faraday)

```typescript
import { FaradayClient } from '@rangesecurity/faraday-sdk';

const faraday = new FaradayClient({ 
  apiKey: process.env.RANGE_API_KEY 
});
```

---

## Base URL

```
https://api.range.org/v1
```

All endpoints are prefixed with this base URL.

---

## Data API

Enterprise-grade blockchain intelligence with unified access to addresses, networks, protocols, and stablecoin analytics across 18+ chains.

### Features

- **18+ Blockchains**: Solana, Ethereum, Cosmos ecosystem, and more with consistent data models
- **Real-Time Updates**: Sub-second latency for critical data with live transaction feeds
- **Enterprise Scale**: Built to handle millions of requests per day with 99.9% uptime SLA

### Address Intelligence

Get complete visibility into any blockchain address with labeled entities, transaction history, balance tracking, and counterparty analysis.

#### Get Address Information

```bash
curl -X GET "https://api.range.org/v1/address?address=YOUR_ADDRESS&network=solana" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**JavaScript:**

```javascript
const response = await fetch(
  `https://api.range.org/v1/address?address=${address}&network=solana`,
  {
    headers: {
      'Authorization': `Bearer ${process.env.RANGE_API_KEY}`
    }
  }
);
const addressInfo = await response.json();
```

**Python:**

```python
import requests

response = requests.get(
    "https://api.range.org/v1/address",
    params={"address": "YOUR_ADDRESS", "network": "solana"},
    headers={"Authorization": f"Bearer {api_key}"}
)
address_info = response.json()
```

#### Get Address Transactions

```bash
curl --location 'https://api.range.org/v1/address/osmo129uhlqcsvmehxgzcsdxksnsyz94dvea907e575/transactions' \
  --header 'X-API-KEY: <YOUR_API_KEY>'
```

### Address Information Capabilities

| Feature | Description |
|---------|-------------|
| **Entity Labels** | Identify exchanges, protocols, MEV bots, and known entities |
| **Transaction History** | Complete transaction and payment history with pagination |
| **Balance Tracking** | Real-time and historical balance changes by token |
| **Counterparty Analysis** | See who an address interacts with most frequently |
| **Activity Metrics** | First/last seen, transaction counts, and activity patterns |

### Network Analytics

Access macro-level blockchain metrics for volume analysis, network health monitoring, and market intelligence.

**Available Metrics:**
- Transaction volumes and counts aggregated by time interval
- Active account tracking and growth trends
- Whale movement detection with large transfer alerts
- Cross-chain transfer monitoring (IBC, CCTP, bridges)
- Network message type distribution and error rates
- USD-denominated balance distributions
- Geographic flow analysis for regional insights

### Protocol Intelligence

Monitor DeFi protocols, bridges, and cross-chain messaging with transaction-level granularity.

**Protocol Coverage:**
- Cross-chain bridge statistics (volume, transaction counts, routes)
- Protocol transaction history with source/destination tracking
- Time-series data for protocol health and adoption metrics
- Token transfer tracking across protocols
- Net flow analysis by protocol and time period

### Stablecoin Analytics

| Feature | Description |
|---------|-------------|
| **DeFi Utilization** | Track stablecoin deposits, borrows, and utilization rates across lending protocols and DEXs |
| **Market Dominance** | Measure stablecoin market share, trading volumes, and TVL across DeFi |
| **Holder Analytics** | Analyze wallet cohorts, holder concentration, and distribution patterns |
| **Flow Intelligence** | Monitor exchange flows, geographic adoption, and fiat on/off-ramp activity |

---

## Risk API

Comprehensive risk scoring and threat detection for blockchain addresses, transactions, and smart contracts.

### Risk Assessment Methodology

Range's risk scoring combines multiple data sources and analytical techniques:

| Technique | Description |
|-----------|-------------|
| **Network Proximity Analysis** | Analyzes shortest path distance between addresses and known malicious entities |
| **Machine Learning Models** | Proprietary ML models trained on verified malicious addresses extract behavioral signatures |
| **Threat Intelligence** | Integrates sanctions lists (OFAC, EU, UK, UN), confirmed exploits, scams, phishing attacks |
| **Behavioral Analysis** | Examines transaction patterns, timing behaviors, counterparty relationships |

### Endpoints Overview

| Endpoint | Description |
|----------|-------------|
| `/v1/risk/address` | Get comprehensive risk scores for blockchain addresses |
| `/v1/risk/transaction` | Assess risk level of specific blockchain transactions |
| `/v1/risk/payment` | Real-time risk evaluation for payment transactions |
| `/v1/risk/token` | Assess token risk profile (Solana) |
| `/v1/risk/sanctions` | Check sanctions and blacklist status |

---

### Address Risk Score

Get comprehensive risk scores for blockchain addresses using network proximity analysis and ML-based threat detection.

```bash
curl -X GET "https://api.range.org/v1/risk/address?address=YOUR_ADDRESS&network=solana" \
  -H "X-API-KEY: <YOUR_API_KEY>"
```

---

### Payment Risk Assessment

Real-time risk evaluation for payment transactions and fund transfers. Analyzes cross-chain payments using advanced heuristic rules and ML-powered analysis.

#### Endpoint

```
GET /v1/risk/payment
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sender_address` | string | Yes | Blockchain address of the sender |
| `recipient_address` | string | Yes | Blockchain address of the recipient |
| `amount` | number | Yes | Transaction amount |
| `sender_network` | string | Yes | Network of sender (e.g., "solana", "ethereum") |
| `recipient_network` | string | Yes | Network of recipient |
| `sender_token` | string | No | Token contract address (sender side) |
| `recipient_token` | string | No | Token contract address (recipient side) |
| `timestamp` | string | No | ISO 8601 timestamp |

#### Example Request

```bash
curl -G https://api.range.org/v1/risk/payment \
  --data-urlencode "sender_address=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" \
  --data-urlencode "recipient_address=7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi" \
  --data-urlencode "amount=1000.0" \
  --data-urlencode "sender_network=solana" \
  --data-urlencode "recipient_network=solana" \
  -H "X-API-KEY: <YOUR_API_KEY>"
```

#### Example Response (High Risk)

```json
{
  "overall_risk_level": "high",
  "risk_factors": [
    {
      "factor": "new_wallet_recipient",
      "risk_level": "medium",
      "description": "Recipient is a completely new wallet with no transaction history"
    },
    {
      "factor": "first_interaction",
      "risk_level": "high",
      "description": "First ever interaction between these addresses"
    },
    {
      "factor": "connected_to_malicious_address",
      "risk_level": "high",
      "description": "Sender is 2 hops away from known malicious addresses"
    }
  ],
  "processing_time_ms": 4159.017,
  "errors": [],
  "request_summary": {
    "sender_address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "recipient_address": "7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi",
    "amount": 1000.0,
    "sender_network": "solana",
    "recipient_network": "solana",
    "sender_token": null,
    "recipient_token": null,
    "timestamp": null
  }
}
```

#### Example Response (Low Risk)

```bash
curl -G https://api.range.org/v1/risk/payment \
  --data-urlencode "sender_address=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" \
  --data-urlencode "recipient_address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" \
  --data-urlencode "amount=250.0" \
  --data-urlencode "sender_network=solana" \
  --data-urlencode "recipient_network=solana" \
  --data-urlencode "sender_token=So11111111111111111111111111111111111111112" \
  --data-urlencode "timestamp=2025-01-15T10:30:00Z" \
  -H "X-API-KEY: <YOUR_API_KEY>"
```

```json
{
  "overall_risk_level": "low",
  "risk_factors": [
    {
      "factor": "established_wallet_recipient",
      "risk_level": "low",
      "description": "Recipient has substantial transaction history"
    },
    {
      "factor": "established_interaction_history",
      "risk_level": "low",
      "description": "Strong interaction history: 15 previous interactions found"
    }
  ],
  "processing_time_ms": 1876.45,
  "errors": []
}
```

### Risk Assessment Factors

The payment risk assessment employs a multi-layered approach combining eight independent risk assessments:

| Factor | Description |
|--------|-------------|
| **New Wallet Detection** | Identifies recipients with minimal or no transaction history |
| **Dormant Wallet Detection** | Flags recipient addresses reactivating after >180 days of inactivity |
| **Address Poisoning Detection** | Analyzes sender's potential poison addresses and checks recipient patterns |
| **First Interaction Analysis** | Detects if this is the first ever interaction between addresses |
| **Malicious Connection Analysis** | Uses ML-powered distance-to-malicious endpoint to identify connections |
| **Attributed Address Check** | Verifies addresses against known attribution databases |
| **Token Risk Assessment** | Evaluates token-specific risk factors (Solana tokens) |
| **Cross-Chain Support** | Handles same-network and cross-chain payment scenarios |

### Risk Level Determination

The overall risk level uses a maximum risk approach:
- If **any** assessment returns "high" → overall risk is **"high"**
- If the highest is "medium" → overall is **"medium"**
- If all are "low" → overall is **"low"**

### Processing Times by Network Support

| Scenario | Processing Time | Description |
|----------|-----------------|-------------|
| Full Support | ~1000-3000ms | Both networks have payment data available |
| Partial Support | ~200-600ms | One network has data, assessments run for supported side |
| Limited Support | ~130-500ms | Neither network has full data, attribution checks still run |

### Risk Factor Names Reference

```
# Wallet Assessment
new_wallet_recipient
established_wallet_recipient
dormant_wallet_recipient

# Interaction History
first_interaction
established_interaction_history

# Malicious Connection (Sender)
malicious_connection_sender_direct
malicious_connection_sender_high
malicious_connection_sender_medium
malicious_connection_sender_low
clean_address_sender

# Malicious Connection (Recipient)
malicious_connection_recipient_direct
malicious_connection_recipient_high
malicious_connection_recipient_medium
malicious_connection_recipient_low
clean_address_recipient

# Attribution
malicious_address_sender
malicious_address_recipient
attributed_address_sender
attributed_address_recipient
known_attributed_sender
known_attributed_recipient

# Token Risk
token_risk_sender_low
token_risk_sender_medium
token_risk_sender_high
token_risk_recipient_low
token_risk_recipient_medium
token_risk_recipient_high
```

---

### Token Risk Assessment (Solana)

Assess the risk profile of tokens including liquidity, holder distribution, and contract security.

```
GET /v1/risk/token
```

---

### Sanctions & Blacklist Check

Check if an address appears on OFAC, EU, UK, UN or other sanctions lists and blacklists.

```
GET /v1/risk/sanctions
```

---

### Transaction Simulation

#### Simulate Solana Transaction

Simulate a Solana transaction to get the address balance changes after execution.

```
POST /v1/simulator/solana
```

**Use Cases:**
- Pre-broadcast validation without committing to the blockchain
- Debugging transaction issues
- Cost estimation for fees and compute units
- Testing program behavior before deployment

**Request Body:**

```json
{
  "transaction": "<base64_encoded_transaction>",
  "cluster": "mainnet-beta"
}
```

#### Simulate Cosmos Transaction

```
POST /v1/simulator/cosmos
```

---

## Faraday API

Enterprise stablecoin infrastructure with built-in routing, compliance, and risk management for safe cross-chain transfers.

### Overview

Faraday is the all-in-one API for sending and receiving stablecoin transactions with built-in:
- **Best Execution**: Aggregate quotes from 15+ DEX aggregators and bridges
- **Fraud Detection**: Screen for address poisoning, sanctioned wallets, and common errors
- **Compliance**: Travel Rule support, OFAC screening, and sanctions monitoring

### Key Features

| Feature | Description |
|---------|-------------|
| **Cross-Chain Transfers** | USDT on Solana to USDC on Ethereum in a single API call |
| **15+ Aggregator Integration** | Jupiter, 1inch, Orca, Raydium, and more |
| **Cross-Chain Bridges** | CCTP, Wormhole, LayerZero, and other trusted bridges |
| **Dynamic Route Optimization** | Real-time pricing and liquidity analysis |
| **Slippage Protection** | Configurable slippage tolerance and price guarantees |
| **Non-Custodial** | Users maintain control of funds at all times |

### SDK Installation

```bash
npm install @rangesecurity/faraday-sdk
```

### Quick Start Example

```typescript
import { FaradayClient } from '@rangesecurity/faraday-sdk';

const faraday = new FaradayClient({ 
  apiKey: process.env.RANGE_API_KEY 
});

// Get best quote for USDT → USDC swap
const quote = await faraday.getQuote({
  sourceChain: 'solana',
  sourceToken: 'USDT',
  destChain: 'ethereum',
  destToken: 'USDC',
  amount: '1000'
});

// Execute with built-in compliance checks
const tx = await faraday.executeQuote(quote.id);
```

### Faraday Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /chains` | List supported chains |
| `GET /tokens` | List supported tokens |
| `GET /providers` | List quote providers/aggregators |
| `POST /quote` | Get a quote for a swap |
| `POST /transactions` | Execute a transaction |
| `GET /transactions/{id}` | Get transaction status |
| `GET /persons` | Manage Travel Rule persons/entities |

### Getting a Quote

```typescript
const quote = await faraday.getQuote({
  sourceChain: 'solana',
  sourceToken: 'USDT',
  destChain: 'ethereum', 
  destToken: 'USDC',
  amount: '1000',
  slippageTolerance: 0.5 // 0.5%
});

console.log(quote);
// {
//   id: "quote_abc123",
//   sourceAmount: "1000",
//   destAmount: "998.50",
//   route: [...],
//   fees: {...},
//   expiresAt: "2025-01-15T10:35:00Z"
// }
```

### Executing a Quote

```typescript
const transaction = await faraday.executeQuote(quote.id, {
  // Optional: Travel Rule compliance data
  senderInfo: {
    name: "John Doe",
    address: "123 Main St"
  },
  recipientInfo: {
    name: "Jane Smith",
    address: "456 Oak Ave"
  }
});
```

### Compliance Layer

| Feature | Description |
|---------|-------------|
| **OFAC Screening** | Real-time checks against sanctioned addresses |
| **Travel Rule** | Automated compliance for jurisdictional requirements |
| **AML Monitoring** | Transaction pattern analysis and risk scoring |
| **Audit Trails** | Immutable records for regulatory reporting |

### Supported Networks & Tokens (Faraday)

| Network | Tokens |
|---------|--------|
| **Solana** | USDC, USDT, PYUSD, and major SPL stablecoins |
| **Ethereum** | USDC, USDT, DAI, FRAX, and ERC-20 stablecoins |
| **Arbitrum** | Native and bridged USDC, USDT, DAI |
| **Base** | USDC (native), bridged stablecoins |

### Faraday Product Comparison

| Feature | Faraday | DEX Aggregators | Manual Swaps |
|---------|---------|-----------------|--------------|
| Best Price Execution | ✅ | ✅ | ❌ |
| Cross-Chain Support | ✅ | ⚠️ | ❌ |
| Compliance Built-in | ✅ | ❌ | ❌ |
| Risk Screening | ✅ | ❌ | ❌ |
| Travel Rule Support | ✅ | ❌ | ❌ |
| Audit Trail | ✅ | ❌ | ❌ |
| Transaction Monitoring | ✅ | ❌ | ❌ |
| Historical Reporting | ✅ | ❌ | ❌ |

### Use Cases

**Stablecoin Remittances**
- Payroll across multiple chains
- Vendor payments in different stablecoins
- International remittances
- Cross-border B2B payments

**Treasury Management**
- DAO treasury operations
- Protocol-owned liquidity management
- Multi-chain asset allocation
- Yield optimization strategies

**Payment Platforms**
- Crypto payment processors
- Remittance platforms
- Neobanks and fintechs
- E-commerce integrations

**Institutional Trading**
- OTC desks
- Market makers
- Fund managers
- Institutional treasury

---

## Supported Networks

### Data API & Risk API Networks

Full support across 18+ blockchains:

| Category | Networks |
|----------|----------|
| **EVM** | Ethereum, Arbitrum, Polygon, Base, Optimism |
| **Solana** | Solana Mainnet |
| **Cosmos Ecosystem** | Osmosis, Cosmos Hub, dYdX, Neutron, Celestia, Stride, Noble, Stargaze, Juno, Kujira, Axelar, Injective, Dymension, Agoric, Mantra, Union |
| **Other** | Stellar |

### Payment Risk API - Full Support Networks

Networks with complete payment data support:
- Solana
- Osmosis
- Cosmos Hub
- dYdX
- Neutron
- Celestia
- Dymension
- Agoric
- Mantra
- Stride
- Noble
- Union
- Stellar

> Networks without payment data still benefit from attribution checks and malicious connection analysis.

---

## TypeScript Types & Interfaces

### Payment Risk Assessment Types

```typescript
type PaymentRiskLevel = "low" | "medium" | "high" | "unknown";

interface PaymentRiskFactor {
  factor: string;
  risk_level: PaymentRiskLevel;
  description: string;
}

interface PaymentRequestSummary {
  sender_address: string;
  recipient_address: string;
  amount: number;
  sender_network: string;
  recipient_network: string;
  sender_token: string | null;
  recipient_token: string | null;
  timestamp: string | null;
}

interface PaymentRiskResponse {
  overall_risk_level: PaymentRiskLevel;
  risk_factors: PaymentRiskFactor[];
  processing_time_ms: number;
  errors: string[];
  request_summary: PaymentRequestSummary;
}
```

### Address Information Types

```typescript
interface AddressInfo {
  address: string;
  network: string;
  tags: string[];
  labels: string[];
  is_validator: boolean;
  is_malicious: boolean;
  entity?: string;
  category?: string;
  role?: string;
  first_seen?: string;
  last_seen?: string;
}

interface AddressTransaction {
  hash: string;
  timestamp: string;
  type: string;
  status: "success" | "failed";
  from: string;
  to: string;
  amount: string;
  token?: string;
  fee: string;
}
```

### Faraday Types

```typescript
interface FaradayQuoteRequest {
  sourceChain: string;
  sourceToken: string;
  destChain: string;
  destToken: string;
  amount: string;
  slippageTolerance?: number;
}

interface FaradayQuote {
  id: string;
  sourceAmount: string;
  destAmount: string;
  route: RouteStep[];
  fees: FeeBreakdown;
  expiresAt: string;
}

interface RouteStep {
  provider: string;
  sourceChain: string;
  destChain: string;
  sourceToken: string;
  destToken: string;
}

interface FeeBreakdown {
  networkFee: string;
  protocolFee: string;
  bridgeFee?: string;
  total: string;
}

interface FaradayTransaction {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  sourceChain: string;
  destChain: string;
  sourceAmount: string;
  destAmount: string;
  sourceTxHash?: string;
  destTxHash?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Invalid or missing API key |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "The provided address is not valid for the specified network",
    "details": {
      "address": "invalid_address",
      "network": "solana"
    }
  }
}
```

### JavaScript Error Handling

```typescript
try {
  const risk = await fetch(`https://api.range.org/v1/risk/payment?...`, {
    headers: { 'X-API-KEY': apiKey }
  });
  
  if (!risk.ok) {
    const error = await risk.json();
    console.error(`Error ${risk.status}: ${error.error.message}`);
    return;
  }
  
  const data = await risk.json();
  // Process data
} catch (error) {
  console.error('Network error:', error);
}
```

### Python Error Handling

```python
import requests

try:
    response = requests.get(
        "https://api.range.org/v1/risk/payment",
        params={...},
        headers={"X-API-KEY": api_key}
    )
    response.raise_for_status()
    data = response.json()
except requests.exceptions.HTTPError as e:
    print(f"HTTP Error: {e.response.status_code} - {e.response.json()}")
except requests.exceptions.RequestException as e:
    print(f"Network Error: {e}")
```

---

## Rate Limits & Pricing

### Free Tier

- **Data API**: 100 requests/month
- **Risk API**: 100 requests/month
- **Faraday API**: 100 quote requests/month
- No credit card required
- Full API access

### Enterprise Pricing

Contact Range team for production pricing based on volume:
- [https://www.range.org/get-in-touch](https://www.range.org/get-in-touch)
- Email: [email protected]

### SLA

- **99.9% Uptime SLA** for enterprise customers
- Dedicated support team
- Priority response times

---

## Quick Reference

### Common cURL Examples

```bash
# Get address info
curl -X GET "https://api.range.org/v1/address?address=YOUR_ADDRESS&network=solana" \
  -H "X-API-KEY: YOUR_API_KEY"

# Get payment risk
curl -G https://api.range.org/v1/risk/payment \
  --data-urlencode "sender_address=SENDER" \
  --data-urlencode "recipient_address=RECIPIENT" \
  --data-urlencode "amount=1000" \
  --data-urlencode "sender_network=solana" \
  --data-urlencode "recipient_network=solana" \
  -H "X-API-KEY: YOUR_API_KEY"

# Get address transactions
curl "https://api.range.org/v1/address/YOUR_ADDRESS/transactions" \
  -H "X-API-KEY: YOUR_API_KEY"
```

### SDK Quick Reference

```typescript
// Faraday SDK
import { FaradayClient } from '@rangesecurity/faraday-sdk';

const client = new FaradayClient({ apiKey: process.env.RANGE_API_KEY });

// Get quote
const quote = await client.getQuote({...});

// Execute quote  
const tx = await client.executeQuote(quote.id);

// Get transaction status
const status = await client.getTransaction(tx.id);
```

---

## Resources

| Resource | URL |
|----------|-----|
| **Documentation** | [https://docs.range.org](https://docs.range.org) |
| **Dashboard** | [https://app.range.org](https://app.range.org) |
| **GitHub** | [https://github.com/rangesecurity](https://github.com/rangesecurity) |
| **Contact** | [https://www.range.org/get-in-touch](https://www.range.org/get-in-touch) |
| **Support Email** | [email protected] |

---

## Changelog

For the latest updates, new features, and API enhancements, visit:
[https://docs.range.org/resources/changelog](https://docs.range.org/resources/changelog)

---

*Last updated: January 2025*

*Documentation source: [https://docs.range.org](https://docs.range.org)*
