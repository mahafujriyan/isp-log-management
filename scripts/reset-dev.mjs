#!/usr/bin/env node
/** Kill dev ports + clear .next cache + sync env — fixes stale 404 on /auth/login */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("Resetting local dev environment...\n");

execSync("node scripts/kill-dev-ports.mjs", { cwd: root, stdio: "inherit" });

for (const dir of ["apps/marketing", "apps/super-admin", "apps/operator"]) {
  const nextDir = path.join(root, dir, ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log(`✓ cleared ${dir}/.next`);
  }
}

execSync("node scripts/sync-env.mjs", { cwd: root, stdio: "inherit" });

console.log("\n✓ Dev reset complete. Run: npm run dev");
console.log("  Operator login: http://localhost:3002/auth/login");
