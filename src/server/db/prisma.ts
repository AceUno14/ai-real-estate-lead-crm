import { PrismaPg } from "@prisma/adapter-pg";

import { getServerEnv } from "@/lib/env";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client singleton (Prisma 7 + PostgreSQL driver adapter).
 *
 * In dev, Next.js hot reloads modules; caching the client on globalThis
 * avoids creating a new connection pool on every reload. In production a
 * single instance is reused per server process.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL } = getServerEnv();
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
