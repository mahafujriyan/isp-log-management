#!/usr/bin/env node
/**
 * Introspect VPS/local PostgreSQL → prisma/schema.prisma (for Prisma Studio).
 * Run after: npm run db:setup && npm run db:migrate
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadPrismaEnv } from "./prisma-env.mjs";
import { resolvePgDatabaseUrl } from "./lib/prisma-db-url.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const url = loadPrismaEnv();
const client = new pg.Client({ connectionString: resolvePgDatabaseUrl(url) });
await client.connect();

const tenants = await client.query(
  `SELECT schema_name FROM public.tenants
   WHERE status = 'active' AND schema_name NOT LIKE 'tenant_pending_%'
   ORDER BY id`
);
await client.end();

const tenantSchemas = tenants.rows.map((r) => r.schema_name).filter(Boolean);
const schemas = ["public", ...tenantSchemas];

console.log("Introspecting schemas:", schemas.join(", "));
console.log("Database:", url.replace(/:[^:@/]+@/, ":***@"));

const schemaArg = schemas.join(",");
execSync(`npx prisma db pull --schemas ${schemaArg} --force`, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

console.log("\n✓ prisma/schema.prisma updated");
console.log("  Open Studio: npm run db:studio");
