#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const [appKey, port] = process.argv.slice(2);
if (!appKey || !port) {
  console.error("Usage: node scripts/run-next-dev.mjs <marketing|super-admin|operator> <port>");
  process.exit(1);
}

const dirs = {
  marketing: "apps/marketing",
  "super-admin": "apps/super-admin",
  operator: "apps/operator",
};

const dir = dirs[appKey];
if (!dir) {
  console.error(`Unknown app: ${appKey}`);
  process.exit(1);
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  console.error("Next.js not found. Run: npm install");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  cwd: path.join(root, dir),
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
