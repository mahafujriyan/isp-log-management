import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolvePgDatabaseUrl } from "../../../scripts/lib/prisma-db-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** `database/` folder */
export const databaseRoot = path.join(__dirname, "../..");

/** Monorepo root (where `.env.local` lives) */
export const repoRoot = path.join(databaseRoot, "..");

export function loadEnvFiles() {
  for (const file of [".env.production.local", ".env.local", ".env"]) {
    loadEnvFile(path.join(repoRoot, file));
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

export function getDatabaseUrl() {
  loadEnvFiles();
  const url = resolvePgDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    const envPath = path.join(repoRoot, ".env.local");
    console.error("DATABASE_URL is required.");
    console.error(`  Checked: ${envPath} ${fs.existsSync(envPath) ? "(exists)" : "(missing)"}`);
    console.error("  Add DATABASE_URL=postgres://... to root .env.local");
    process.exit(1);
  }
  process.env.DATABASE_URL = url;
  return url;
}

export function createPgClient(url = getDatabaseUrl()) {
  return new pg.Client({
    connectionString: url,
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
}

export function readSql(relativePath) {
  const sqlPath = path.join(databaseRoot, relativePath);
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing SQL file: ${relativePath}`);
  }
  return fs.readFileSync(sqlPath, "utf8");
}

export async function runSql(client, sql, label) {
  await client.query(sql);
  if (label) console.log(`  ✓ ${label}`);
}

export async function runSqlFile(client, relativePath, label) {
  await runSql(client, readSql(relativePath), label ?? relativePath);
}

export async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(128) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function isMigrationApplied(client, version) {
  const row = await client.query(
    "SELECT 1 FROM public.schema_migrations WHERE version = $1 LIMIT 1",
    [version]
  );
  return row.rowCount > 0;
}

export async function recordMigration(client, version) {
  await client.query(
    "INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
    [version]
  );
}
