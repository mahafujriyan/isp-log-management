#!/usr/bin/env node
/**
 * Apply demo_requests + demo provisioning migrations (safe to re-run).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPgClient } from "./lib/db-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  "demo-request-migration.sql",
  "demo-provisioning-migration.sql",
  "demo-sandbox-enrichment.sql",
];

const client = createPgClient();

try {
  await client.connect();
  for (const file of MIGRATIONS) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing migration: ${file}`);
      continue;
    }
    await client.query(fs.readFileSync(filePath, "utf8"));
  }
  console.log("✓ Demo provisioning migrations applied.");
} catch (error) {
  console.error("✗ Demo migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
