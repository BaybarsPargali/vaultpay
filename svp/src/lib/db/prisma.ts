// src/lib/db/prisma.ts
// Prisma Client Singleton for Next.js
// Prevents multiple Prisma Client instances in development

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? process.env.PRISMA_LOG_QUERIES === 'true'
          ? ['query', 'error', 'warn']
          : ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
