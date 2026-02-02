#!/bin/bash
# VaultPay MXE Cluster Fix Script
# Run this from Ubuntu/WSL in the vaultpay_confidential directory
#
# PROBLEM: The MXE was deployed with `--cluster devnet` (wrong) instead of `--cluster-offset 123`
# This caused the MXE to be associated with a non-existent cluster.
#
# SOLUTION: Redeploy using `--skip-deploy` to only reinitialize the MXE with correct cluster-offset

set -e

echo "=========================================="
echo "VaultPay MXE Cluster Fix"
echo "=========================================="
echo ""
echo "This script will reinitialize the MXE account with cluster-offset 123"
echo "The program is already deployed, so we use --skip-deploy"
echo ""

# Check prerequisites
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
    exit 1
fi
echo "✅ Wallet found: $WALLET_PATH"

# Get Helius API key from environment or prompt
if [ -z "$HELIUS_API_KEY" ]; then
    echo ""
    echo "⚠️  HELIUS_API_KEY environment variable not set."
    echo "   You can set it with: export HELIUS_API_KEY=your-api-key"
    echo ""
    read -p "Enter your Helius API key: " HELIUS_API_KEY
fi

RPC_URL="https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}"
echo "✅ RPC URL configured"

# Navigate to project
cd "$(dirname "$0")"
echo ""
echo "Working directory: $(pwd)"

# Confirm action
echo ""
echo "⚠️  This will reinitialize the MXE account with cluster-offset 123."
echo "   The existing MXE account will be updated."
echo ""
read -p "Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Run arcium deploy with --skip-deploy to only reinitialize MXE
echo ""
echo "Reinitializing MXE with cluster-offset 123..."
arcium deploy --cluster-offset 123 \
  --keypair-path "$WALLET_PATH" \
  --rpc-url "$RPC_URL" \
  --skip-deploy

echo ""
echo "=========================================="
echo "MXE REINITIALIZED!"
echo "=========================================="
echo ""
echo "The MXE is now associated with cluster offset 123."
echo "You should also reinitialize the computation definitions."
echo ""
echo "To verify, run: npx ts-node scripts/init-arcium.ts"
