#!/bin/bash
# VaultPay Arcium Deployment Script for Devnet
# Run this from Ubuntu/WSL

set -e

echo "=========================================="
echo "VaultPay Arcium MPC Deployment to Devnet"
echo "=========================================="

# Check prerequisites
echo ""
echo "Checking prerequisites..."

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install it:"
    echo "   sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""
    exit 1
fi
echo "✅ Solana CLI: $(solana --version)"

# Check Anchor CLI
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Install it:"
    echo "   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "   avm install latest && avm use latest"
    exit 1
fi
echo "✅ Anchor CLI: $(anchor --version)"

# Check Arcium CLI
if ! command -v arcium &> /dev/null; then
    echo "❌ Arcium CLI not found. Install it:"
    echo "   cargo install arcium-cli"
    exit 1
fi
echo "✅ Arcium CLI: $(arcium --version)"

# Check wallet
WALLET_PATH="$HOME/.config/solana/id.json"
if [ ! -f "$WALLET_PATH" ]; then
    echo "❌ Solana wallet not found at $WALLET_PATH"
    echo "   Create one with: solana-keygen new"
    exit 1
fi
echo "✅ Wallet found: $WALLET_PATH"

# Configure for devnet
echo ""
echo "Configuring Solana for devnet..."
solana config set --url devnet

# Check balance
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo ""
    echo "⚠️  Low balance! You need at least 2 SOL for deployment."
    echo "   Get devnet SOL from: https://faucet.solana.com/"
    PUBKEY=$(solana address)
    echo "   Your wallet address: $PUBKEY"
    echo ""
    read -p "Press Enter after you've added SOL to continue..."
    BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
    echo "New balance: $BALANCE SOL"
fi

# Navigate to project
cd "$(dirname "$0")"
echo ""
echo "Working directory: $(pwd)"

# Install dependencies
echo ""
echo "Installing dependencies..."
yarn install

# Build the Anchor program
echo ""
echo "Building Anchor program..."
anchor build

# Get the program keypair
PROGRAM_KEYPAIR="target/deploy/vaultpay_confidential-keypair.json"
if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    echo "❌ Program keypair not found at $PROGRAM_KEYPAIR"
    exit 1
fi

VAULTPAY_PROGRAM_ID=$(solana address -k $PROGRAM_KEYPAIR)
echo "VaultPay Program ID: $VAULTPAY_PROGRAM_ID"

# Deploy with Arcium
# Note: --cluster-offset specifies which Arcium MPC cluster to use (123, 456, or 789 on devnet)
# The -u d flag specifies Solana devnet as the network
echo ""
echo "Deploying to Arcium devnet cluster (offset 123)..."
arcium deploy --cluster-offset 123 \
  --keypair-path ~/.config/solana/id.json \
  --rpc-url https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY:-YOUR_API_KEY}

# Get the Arcium program ID from deployment output
echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Add these to your .env file:"
echo ""
echo "NEXT_PUBLIC_VAULTPAY_PROGRAM_ID=\"$VAULTPAY_PROGRAM_ID\""
echo ""
echo "NOTE: Copy the Arcium Program ID from the arcium deploy output above"
echo "      and add it as: NEXT_PUBLIC_ARCIUM_PROGRAM_ID=\"<program-id>\""
echo ""
echo "Then restart your Next.js dev server!"
