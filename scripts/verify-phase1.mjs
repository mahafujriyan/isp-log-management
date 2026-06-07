#!/usr/bin/env node
/**
 * PHASE 1 verification script
 * Run: npm run verify:phase1
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("\nISP Log Server — PHASE 1 Verification\n");

// Node.js version
const nodeMajor = parseInt(process.version.slice(1).split(".")[0], 10);
if (nodeMajor >= 20) pass("Node.js 20+", process.version);
else fail("Node.js 20+", `Found ${process.version}`);

// Required files
const requiredFiles = [
  "src/lib/database.ts",
  "src/services/auth.service.ts",
  "src/services/btrc.service.ts",
  "src/services/mock-data.service.ts",
  "src/config/env.config.ts",
  "src/config/app.config.ts",
  "src/constants/routes.constants.ts",
  "src/utils/date.utils.ts",
  "src/types/index.ts",
  "src/app/api/health/route.ts",
  "src/app/api/tenants/route.ts",
  "src/app/api/logs/route.ts",
  "src/app/api/users/route.ts",
  "src/app/dashboard/page.tsx",
  "src/app/auth/login/page.tsx",
  "src/components/shared/Sidebar.tsx",
  "src/components/dashboard/MetricCard.tsx",
  "src/components/dashboard/LogsTable.tsx",
  "src/components/admin/TenantManager.tsx",
  "scripts/init-db.sql",
  ".env.example",
  "package.json",
];

for (const f of requiredFiles) {
  if (existsSync(resolve(root, f))) pass(`File: ${f}`);
  else fail(`File: ${f}`, "missing");
}

// package.json scripts
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
for (const script of ["dev", "build", "start", "type-check"]) {
  if (pkg.scripts?.[script]) pass(`Script: ${script}`);
  else fail(`Script: ${script}`, "missing");
}

// Dependencies
for (const dep of ["pg", "next-auth", "bcryptjs", "axios", "zustand", "lucide-react"]) {
  if (pkg.dependencies?.[dep]) pass(`Dependency: ${dep}`);
  else fail(`Dependency: ${dep}`, "not installed");
}

// .env.local
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  pass(".env.local exists");
  const env = readFileSync(envPath, "utf8");
  if (/DATABASE_URL=/.test(env)) pass("DATABASE_URL configured");
  else fail("DATABASE_URL configured", "add to .env.local");
  if (/AUTH_SECRET=|NEXTAUTH_SECRET=/.test(env)) pass("Auth secret configured");
  else fail("Auth secret configured", "add AUTH_SECRET to .env.local");
} else {
  fail(".env.local exists", "copy from .env.example");
}

// Database connection (optional if pg available)
try {
  const envContent = existsSync(envPath)
    ? readFileSync(envPath, "utf8")
    : readFileSync(resolve(root, ".env.example"), "utf8");
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: match[1].trim() });
    const result = await pool.query("SELECT NOW() as t, version()");
    await pool.end();
    pass("PostgreSQL connection", result.rows[0].t.toISOString().slice(0, 19));
  }
} catch (e) {
  fail("PostgreSQL connection", e.message?.slice(0, 80) ?? "cannot connect");
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);

if (failed === 0) {
  console.log("\n✅ PHASE 1 COMPLETE — ready for PHASE 2\n");
  process.exit(0);
} else {
  console.log(`\n⚠ ${failed} check(s) failed — fix above items\n`);
  process.exit(1);
}
