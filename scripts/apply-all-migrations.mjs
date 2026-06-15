#!/usr/bin/env node
/**
 * Apply all VPS-safe migrations (no psql required).
 * Run after db:setup on fresh DB, or anytime to patch missing columns/tables.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabaseUrl } from "./lib/db-utils.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

getDatabaseUrl();
console.log("Applying database migrations...\n");

const steps = [
  ["MikroTik syslog (routers, session_logs)", "apply-mikrotik-syslog.mjs"],
  ["Device credentials (api_user, api_password, api_port)", "apply-device-credentials.mjs"],
  ["Company branding columns", "apply-company-branding.mjs"],
  ["Demo provisioning", "apply-demo-migrations.mjs"],
  ["Register CLC-SFP1 MikroTik device", "apply-register-sfp1.mjs"],
];

for (const [label, script] of steps) {
  console.log(`>> ${label}`);
  execSync(`node scripts/${script}`, { cwd: root, stdio: "inherit" });
}

console.log("\n✓ All migrations complete.");
console.log("  Restart apps: npm run pm2:restart");
