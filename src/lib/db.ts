import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDb = globalThis as unknown as { db?: PrismaClient };
// Each serverless instance owns a pool; keep it small when using Neon's pooler.
export const db = globalDb.db ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 }) });
if (process.env.NODE_ENV !== 'production') globalDb.db = db;
