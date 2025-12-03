#!/usr/bin/env node
/*
 * Simple migration runner for Supabase IPv6-only environments.
 * Executes SQL files in supabase/migrations in filename order using pg.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from .env.local and .env if present
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createClient(dbUrl) {
  const client = new Client({
    connectionString: dbUrl,
    statement_timeout: 600000,
    connectionTimeoutMillis: 60000,
    query_timeout: 600000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: { rejectUnauthorized: false },
  });
  return client;
}

async function connectWithRetry(dbUrl) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}/${MAX_RETRIES}...`);
      const client = await createClient(dbUrl);
      await client.connect();
      console.log('Connected successfully');
      return client;
    } catch (err) {
      lastError = err;
      console.warn(`Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

async function runMigration(client, file, sql) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      return true;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Ignore rollback errors
      }
      lastError = err;
      
      // Don't retry on syntax/semantic errors
      if (err.code && !err.code.startsWith('08') && !err.code.startsWith('57')) {
        throw err;
      }
      
      console.warn(`Migration attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Set it in .env.local or the environment.');
    process.exit(1);
  }

  // Log connection info (without password)
  try {
    const urlObj = new URL(dbUrl);
    console.log(`Connecting to: ${urlObj.hostname}:${urlObj.port || 5432}${urlObj.pathname}`);
  } catch {
    console.log('Connecting to database...');
  }

  const migrationsDir = path.resolve(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    // Ensure schema init files are applied before policy files regardless of timestamp
    .sort((a, b) => {
      const aIsInit = /init\.sql$/i.test(a);
      const bIsInit = /init\.sql$/i.test(b);
      if (aIsInit && !bIsInit) return -1;
      if (!aIsInit && bIsInit) return 1;
      return a.localeCompare(b);
    });

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  console.log(`Found ${files.length} migration files`);

  const client = await connectWithRetry(dbUrl);

  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`Applying migration: ${file}`);
      
      await runMigration(client, file, sql);
      console.log(`Applied: ${file}`);
    }
    console.log('All migrations applied successfully');
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore close errors
    }
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
