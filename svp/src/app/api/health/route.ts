// src/app/api/health/route.ts
// Health Check API Endpoint
// Returns status of all system components for monitoring

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getConnection } from '@/lib/solana/connection';
import { getRateLimitStoreType } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  components: {
    database: ComponentStatus;
    solanaRpc: ComponentStatus;
    rateLimit: ComponentStatus;
  };
  environment: {
    nodeEnv: string;
    network: string;
  };
}

interface ComponentStatus {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

async function checkDatabase(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    // Simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkSolanaRpc(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    const connection = getConnection();
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    
    return {
      status: 'up',
      latencyMs: Date.now() - start,
      details: {
        slot,
        blockHeight,
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
      },
    };
  } catch (error) {
    logger.error({ error }, 'Solana RPC health check failed');
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkRateLimit(): ComponentStatus {
  try {
    const storeType = getRateLimitStoreType();
    return {
      status: 'up',
      details: {
        storeType,
        isRedis: storeType === 'redis',
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // Run health checks in parallel
    const [database, solanaRpc] = await Promise.all([
      checkDatabase(),
      checkSolanaRpc(),
    ]);
    
    const rateLimit = checkRateLimit();
    
    // Determine overall status
    const components = { database, solanaRpc, rateLimit };
    const componentStatuses = Object.values(components).map(c => c.status);
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (componentStatuses.some(s => s === 'down')) {
      overallStatus = 'unhealthy';
    } else if (componentStatuses.some(s => s === 'degraded')) {
      overallStatus = 'degraded';
    }
    
    const health: HealthStatus = {
      status: overallStatus,
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
      components,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
      },
    };
    
    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;
    
    logger.debug({ 
      healthStatus: overallStatus, 
      latencyMs: Date.now() - start 
    }, 'Health check completed');
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    
    return NextResponse.json({
      status: 'unhealthy',
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}

// HEAD /api/health - Simple health check (for load balancers)
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
