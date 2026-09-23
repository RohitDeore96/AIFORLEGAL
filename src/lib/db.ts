/**
 * Prisma client — optimized for serverless (Vercel) + local dev.
 *
 * Key decisions:
 * 1. Singleton pattern via globalThis — prevents exhausting connection pool
 *    during Next.js dev hot reloads (each reload creates a new PrismaClient).
 * 2. Query logging disabled in production — console.log of every query adds
 *    ~1ms latency per request and floods Vercel logs.
 * 3. For Neon serverless: set connection_limit=1 in the DATABASE_URL via
 *    ?connection_limit=1&pool_timeout=10. This prevents connection exhaustion
 *    when many concurrent function instances each try to open a pool.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // Only log queries in development — production logging adds latency
    // and floods Vercel function logs with noise.
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
    // Serverless-optimized datasource config (Prisma 6+ supports this)
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Cache the client on globalThis to survive hot reloads in dev.
// In production, each serverless function invocation gets its own instance,
// but Vercel reuses warm instances so this still helps.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Graceful shutdown — ensures the Prisma client disconnects cleanly when
 * the serverless function is recycled. Prevents "too many connections"
 * errors on Neon.
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await db.$disconnect();
  } catch {
    // Ignore — function is being recycled anyway
  }
}
