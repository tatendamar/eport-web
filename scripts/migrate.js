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

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Set it in .env.local or the environment.');
    process.exit(1);
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

  const client = new Client({
    connectionString: dbUrl,
    statement_timeout: 600000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`Applying migration: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed migration: ${file}`);
        console.error(err.message);
        process.exit(1);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
