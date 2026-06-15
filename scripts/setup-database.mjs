#!/usr/bin/env node
/**
 * Apply full database schema using Node + pg (no psql required).
 * Reads DATABASE_URL from .env.local or environment.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptsDir = __dirname;
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

function preprocessSql(content, baseDir, seen = new Set()) {
  let sql = content.replace(/^\\c\s+.+$/gm, "").trim();

  sql = sql.replace(/^\\i\s+(.+)$/gm, (_, includeRel) => {
    const includePath = path.resolve(baseDir, includeRel.trim());
    if (seen.has(includePath)) return "";
    seen.add(includePath);
    if (!fs.existsSync(includePath)) {
      throw new Error(`Missing SQL include: ${includePath}`);
    }
    return preprocessSql(fs.readFileSync(includePath, "utf8"), path.dirname(includePath), seen);
  });

  return sql;
}

async function main() {
  loadEnvFile(path.join(root, ".env.production.local"));
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  const initPath = path.join(scriptsDir, "init-db.sql");
  if (!fs.existsSync(initPath)) {
    console.error("ERROR: scripts/init-db.sql not found");
    process.exit(1);
  }

  const sql = preprocessSql(fs.readFileSync(initPath, "utf8"), scriptsDir);
  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  console.log("Connecting to database...");
  await client.connect();
  console.log("Applying schema (plans, tenants, users, BTRC, tenant_001, metrics)...");

  try {
    await client.query(sql);
    console.log("✓ Database setup complete");

    const checks = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.plans) AS plans,
        (SELECT COUNT(*)::int FROM public.tenants) AS tenants,
        (SELECT COUNT(*)::int FROM public.metrics) AS metrics
    `);
    const row = checks.rows[0];
    console.log(`  plans: ${row.plans}, tenants: ${row.tenants}, metrics: ${row.metrics}`);
  } catch (error) {
    console.error("Setup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
