#!/usr/bin/env node
/**
 * Start all 3 Next.js dev servers (direct spawn — stable on Windows).
 */
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const isWin = process.platform === "win32";

execSync("node scripts/sync-env.mjs", { cwd: root, stdio: "inherit" });
execSync("node scripts/kill-dev-ports.mjs", { cwd: root, stdio: "inherit" });

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ISP LogServer — ৩টা Portal (আলাদা port!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ① Marketing       http://localhost:3000
  ② Super Admin     http://localhost:3001
  ③ Operator        http://localhost:3002

  ⚠ localhost:3000 এ সব আসে না — ৩টা URL আলাদা খুলুন!
  Browser auto-open:  npm run dev:open
  Stop:              Ctrl+C  or  npm run dev:stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  console.error("❌ Run: npm install");
  process.exit(1);
}

const APPS = [
  { label: "marketing", dir: "apps/marketing", port: 3000 },
  { label: "admin", dir: "apps/super-admin", port: 3001 },
  { label: "operator", dir: "apps/operator", port: 3002 },
];

const children = APPS.map(({ label, dir, port }) => {
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
    cwd: path.join(root, dir),
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  });
  child.on("error", (err) => console.error(`✗ [${label}]`, err.message));
  return { label, child };
});

let stopping = false;

function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping...");
  for (const { child } of children) {
    if (child.killed || !child.pid) continue;
    if (isWin) {
      try {
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {
        child.kill("SIGTERM");
      }
    } else {
      child.kill("SIGTERM");
    }
  }
  try {
    execSync("node scripts/kill-dev-ports.mjs", { cwd: root, stdio: "ignore" });
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep parent alive while any server runs
process.stdin.resume();
