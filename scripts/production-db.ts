import {config} from 'dotenv';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

// This command deliberately reads a separate ignored file, never the local database.
config({path: '.env.production.local', override: true, quiet: true});
const migrate = process.argv.includes('--migrate');
let client: pg.Client | undefined;
try {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('Paste the Neon connection string into DATABASE_URL in .env.production.local, then run this check again.');
  const pooled = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(pooled.protocol) ||
      !pooled.hostname.endsWith('.neon.tech') || !pooled.password ||
      !['require', 'verify-full'].includes(pooled.searchParams.get('sslmode') || '')) {
    throw new Error('Add the complete Neon PostgreSQL URL with SSL to DATABASE_URL in .env.production.local.');
  }
  const direct = new URL(process.env.DIRECT_URL || pooled.toString());
  if (!process.env.DIRECT_URL) direct.hostname = direct.hostname.replace('-pooler.', '.');
  if (direct.hostname.includes('-pooler.') || direct.hostname !== pooled.hostname.replace('-pooler.', '.') ||
      direct.pathname !== pooled.pathname || !direct.password ||
      !['require', 'verify-full'].includes(direct.searchParams.get('sslmode') || '')) {
    throw new Error('DIRECT_URL must be the SSL direct connection for the same Neon database.');
  }
  process.env.DIRECT_URL = direct.toString();
  client = new pg.Client({connectionString: direct.toString(), connectionTimeoutMillis: 10000});
  await client.connect();
  const {rows} = await client.query<{tablename: string}>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('Neon connected over SSL. Public tables:', rows.length);
  for (const table of ['User', 'Product', 'Quote', 'Order', 'Notification']) {
    if (rows.some(row => row.tablename === table)) {
      const result = await client.query(`SELECT count(*)::int AS count FROM "${table}"`);
      console.log(`${table}: ${result.rows[0].count} records`);
    }
  }
  await client.end(); client = undefined;
  // Explicit opt-in: inspection is the default; never reset, push or seed production.
  const prisma = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
  const result = spawnSync(process.execPath, [prisma, 'migrate', migrate ? 'deploy' : 'status'], {
    env: process.env, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  // Prisma errors can contain connection details; keep output private and report safely.
  if (result.status !== 0) throw new Error(migrate
    ? 'Migration deployment did not complete. Inspect the database migration state before retrying; no reset was performed.'
    : 'Neon is reachable, but migrations need review. No schema changes were made.');
  console.log(migrate ? 'Additive migrations applied successfully.' : 'Migration history is up to date. No changes made.');
} catch (error) {
  const message = error instanceof Error && !/postgres(?:ql)?:\/\//i.test(error.message) ? error.message : 'Production database check failed.';
  console.error(message.replace(/password\s*[^\s]*/gi, '[credential redacted]'));
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}
