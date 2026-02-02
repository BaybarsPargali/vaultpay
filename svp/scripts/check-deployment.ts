/**
 * VaultPay - Deployment Readiness Checker
 * 
 * This script checks if all required components are properly configured
 * for production deployment.
 * 
 * Usage:
 *   npx ts-node scripts/check-deployment.ts
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - Critical issues found
 *   2 - Warnings found (but can proceed)
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  getMXEAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getClusterAccAddress,
  getMempoolAccAddress,
  getArciumProgramId,
  getArciumAccountBaseSeed,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VAULTPAY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VAULTPAY_PROGRAM_ID || 'ARQq9rbUZLJLSUSmcrUuQH37TC66Euown4yXBJJj9UbJ'
);
const CONFIDENTIAL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_CONFIDENTIAL_MINT || 'Eu6LtYwCWvLQpsr2J1gdRRtsTQdUu6G3vnAQ8CCPLsRo'
);
const MXE_ACCOUNT = new PublicKey(
  process.env.NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT || '13a5kaHnbkC8RsMcrtEtAyEuj1jYZZs941regeuKS4bk'
);
const CLUSTER_OFFSET = parseInt(process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET || '123');
const RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}

const results: CheckResult[] = [];

function addResult(result: CheckResult) {
  results.push(result);
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${icon} ${result.name}: ${result.message}`);
  if (result.fix && result.status !== 'pass') {
    console.log(`   Fix: ${result.fix}`);
  }
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   VaultPay - Deployment Readiness Check                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');

  // 1. Check RPC Connection
  console.log('📡 Checking RPC connection...');
  try {
    const version = await connection.getVersion();
    addResult({
      name: 'RPC Connection',
      status: 'pass',
      message: `Connected to ${RPC_URL} (Solana ${version['solana-core']})`,
    });
  } catch (err) {
    addResult({
      name: 'RPC Connection',
      status: 'fail',
      message: `Failed to connect to ${RPC_URL}`,
      fix: 'Set NEXT_PUBLIC_HELIUS_RPC_URL to a valid Solana RPC endpoint',
    });
  }
  console.log('');

  // 2. Check VaultPay Program
  console.log('🔍 Checking VaultPay program...');
  try {
    const programInfo = await connection.getAccountInfo(VAULTPAY_PROGRAM_ID);
    if (programInfo && programInfo.executable) {
      addResult({
        name: 'VaultPay Program',
        status: 'pass',
        message: `Deployed at ${VAULTPAY_PROGRAM_ID.toBase58()}`,
      });
    } else {
      addResult({
        name: 'VaultPay Program',
        status: 'fail',
        message: 'Program not found or not executable',
        fix: 'Deploy program: cd vaultpay_confidential && arcium deploy --cluster-offset 123',
      });
    }
  } catch (err) {
    addResult({
      name: 'VaultPay Program',
      status: 'fail',
      message: `Error checking program: ${err}`,
    });
  }
  console.log('');

  // 3. Check MXE Account
  console.log('🔍 Checking Arcium MXE account...');
  try {
    const mxeInfo = await connection.getAccountInfo(MXE_ACCOUNT);
    if (mxeInfo && mxeInfo.data.length >= 40) {
      addResult({
        name: 'Arcium MXE',
        status: 'pass',
        message: `Initialized at ${MXE_ACCOUNT.toBase58()} (${mxeInfo.data.length} bytes)`,
      });
    } else if (mxeInfo) {
      addResult({
        name: 'Arcium MXE',
        status: 'warn',
        message: `Account exists but may not be initialized (${mxeInfo?.data.length || 0} bytes)`,
        fix: 'Re-deploy with: arcium deploy --cluster-offset 123 --skip-deploy',
      });
    } else {
      addResult({
        name: 'Arcium MXE',
        status: 'fail',
        message: 'MXE account not found',
        fix: 'Deploy program with Arcium: arcium deploy --cluster-offset 123',
      });
    }
  } catch (err) {
    addResult({
      name: 'Arcium MXE',
      status: 'fail',
      message: `Error checking MXE: ${err}`,
    });
  }
  console.log('');

  // 4. Check CompDef
  console.log('🔍 Checking computation definition...');
  try {
    const compDefOffset = getCompDefAccOffset('validate_confidential_transfer');
    const compDefIndex = Buffer.from(compDefOffset).readUInt32LE(0);
    
    const baseSeed = getArciumAccountBaseSeed('ComputationDefinitionAccount');
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, VAULTPAY_PROGRAM_ID.toBuffer(), compDefOffset],
      getArciumProgramId(),
    )[0];

    const compDefInfo = await connection.getAccountInfo(compDefPDA);
    if (compDefInfo && compDefInfo.data.length > 0) {
      addResult({
        name: 'CompDef (validate_transfer)',
        status: 'pass',
        message: `Initialized at ${compDefPDA.toBase58()}`,
      });
    } else {
      addResult({
        name: 'CompDef (validate_transfer)',
        status: 'fail',
        message: 'Computation definition not initialized',
        fix: 'Run: npx ts-node scripts/init-arcium.ts',
      });
    }
  } catch (err) {
    addResult({
      name: 'CompDef (validate_transfer)',
      status: 'fail',
      message: `Error checking CompDef: ${err}`,
    });
  }
  console.log('');

  // 5. Check Cluster
  console.log('🔍 Checking Arcium cluster...');
  try {
    const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);
    const clusterInfo = await connection.getAccountInfo(clusterAccount);
    if (clusterInfo) {
      addResult({
        name: `Arcium Cluster ${CLUSTER_OFFSET}`,
        status: 'pass',
        message: `Active at ${clusterAccount.toBase58()}`,
      });
    } else {
      addResult({
        name: `Arcium Cluster ${CLUSTER_OFFSET}`,
        status: 'fail',
        message: 'Cluster not found',
        fix: 'Verify NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET is set correctly (123, 456, or 789 for devnet)',
      });
    }
  } catch (err) {
    addResult({
      name: 'Arcium Cluster',
      status: 'fail',
      message: `Error checking cluster: ${err}`,
    });
  }
  console.log('');

  // 6. Check Confidential Mint
  console.log('🔍 Checking confidential mint...');
  try {
    const mintInfo = await connection.getAccountInfo(CONFIDENTIAL_MINT);
    if (mintInfo) {
      addResult({
        name: 'Token-2022 Confidential Mint',
        status: 'pass',
        message: `Deployed at ${CONFIDENTIAL_MINT.toBase58()}`,
      });
    } else {
      addResult({
        name: 'Token-2022 Confidential Mint',
        status: 'warn',
        message: 'Mint not found (optional for MVP)',
        fix: 'Run: npx ts-node scripts/create-confidential-mint.ts',
      });
    }
  } catch (err) {
    addResult({
      name: 'Token-2022 Confidential Mint',
      status: 'warn',
      message: `Error checking mint: ${err}`,
    });
  }
  console.log('');

  // 7. Check Environment Variables
  console.log('🔍 Checking environment variables...');
  const envVars = [
    { name: 'NEXT_PUBLIC_VAULTPAY_PROGRAM_ID', value: process.env.NEXT_PUBLIC_VAULTPAY_PROGRAM_ID, required: true },
    { name: 'NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT', value: process.env.NEXT_PUBLIC_ARCIUM_MXE_ACCOUNT, required: true },
    { name: 'NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET', value: process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET, required: true },
    { name: 'NEXT_PUBLIC_HELIUS_RPC_URL', value: process.env.NEXT_PUBLIC_HELIUS_RPC_URL, required: true },
    { name: 'RANGE_API_KEY', value: process.env.RANGE_API_KEY, required: false },
    { name: 'NEXT_PUBLIC_CONFIDENTIAL_MINT', value: process.env.NEXT_PUBLIC_CONFIDENTIAL_MINT, required: false },
  ];

  for (const env of envVars) {
    if (env.value) {
      addResult({
        name: env.name,
        status: 'pass',
        message: 'Set',
      });
    } else if (env.required) {
      addResult({
        name: env.name,
        status: 'warn',
        message: 'Not set (using default)',
        fix: `Add ${env.name} to .env.local`,
      });
    } else {
      addResult({
        name: env.name,
        status: 'warn',
        message: 'Not set (optional)',
      });
    }
  }
  console.log('');

  // 8. Check Prisma Schema
  console.log('🔍 Checking database...');
  const prismaPath = path.join(__dirname, '../prisma/schema.prisma');
  const prismaClientPath = path.join(__dirname, '../node_modules/.prisma/client');
  
  if (fs.existsSync(prismaPath)) {
    if (fs.existsSync(prismaClientPath)) {
      addResult({
        name: 'Prisma Client',
        status: 'pass',
        message: 'Generated',
      });
    } else {
      addResult({
        name: 'Prisma Client',
        status: 'fail',
        message: 'Not generated',
        fix: 'Run: npx prisma generate && npx prisma db push',
      });
    }
  } else {
    addResult({
      name: 'Prisma Schema',
      status: 'fail',
      message: 'schema.prisma not found',
    });
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('❌ DEPLOYMENT BLOCKED - Fix critical issues above');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  READY WITH WARNINGS - Review warnings before production');
    process.exit(2);
  } else {
    console.log('✅ READY FOR DEPLOYMENT');
    process.exit(0);
  }
}

main().catch(console.error);
