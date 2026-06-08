#!/usr/bin/env node
/**
 * Apply demo_requests + demo provisioning migrations (safe to re-run).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

const MIGRATIONS = [
  "demo-request-migration.sql",
  "demo-provisioning-migration.sql",
  "demo-sandbox-enrichment.sql",
];

async function main() {
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  console.log("Connecting to database...");
  await client.connect();

  try {
    for (const file of MIGRATIONS) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipping missing migration: ${file}`);
        continue;
      }
      console.log(`Applying ${file}...`);
      await client.query(fs.readFileSync(filePath, "utf8"));
    }

    const check = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'demo_requests'
      ) AS demo_requests_exists
    `);
    console.log("✓ Demo migrations complete");
    console.log(`  demo_requests table: ${check.rows[0].demo_requests_exists ? "OK" : "MISSING"}`);
  } catch (error) {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
