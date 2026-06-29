#!/usr/bin/env node
/**
 * VPS-side ingest diagnostic — run ON the server after SSH:
 *   cd /opt/isp-log-management && npm run test:log-ingest
 *   node scripts/vps-ingest-check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  for (const file of [".env.production.local", ".env.local", ".env"]) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnv();

const base =
  process.env.NEXT_PUBLIC_OPERATOR_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3002";
const localBase = "http://127.0.0.1:3002";
const secret = process.env.INGEST_SECRET || "";
const routerIp = process.env.TEST_ROUTER_IP || "160.187.175.26";

console.log("=== VPS Ingest Diagnostic ===\n");

console.log("Env:");
console.log("  INGEST_SECRET:", secret ? `${secret.slice(0, 4)}... (${secret.length} chars)` : "NOT SET");
console.log("  DATABASE_URL:", process.env.DATABASE_URL ? "set" : "NOT SET");
console.log("  DEFAULT_TENANT_SCHEMA:", process.env.DEFAULT_TENANT_SCHEMA || "tenant_001");
console.log("");

try {
  const pm2 = execSync("pm2 jlist", { encoding: "utf8" });
  const apps = JSON.parse(pm2);
  console.log("PM2:");
  for (const name of ["isp-operator", "isp-syslog-listener"]) {
    const app = apps.find((a) => a.name === name);
    console.log(`  ${name}:`, app?.pm2_env?.status ?? "not found");
  }
  console.log("");
} catch {
  console.log("PM2: not available\n");
}

async function probe(label, url) {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    console.log(`${label} GET /api/health → ${res.status}`, text.slice(0, 120));
    return res.ok;
  } catch (err) {
    console.log(`${label} GET /api/health → FAILED`, err instanceof Error ? err.message : err);
    return false;
  }
}

const localOk = await probe("localhost", localBase);
if (base !== localBase) await probe("public URL", base);

if (!secret) {
  console.log("\n✗ Fix: set INGEST_SECRET in .env.production.local then npm run pm2:restart");
  process.exit(1);
}

if (!localOk) {
  console.log("\n✗ Fix: pm2 status — isp-operator must be online on port 3002");
  process.exit(1);
}

const sampleLog =
  `<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info ` +
  `pppoe_user=clc_test@cyberlink mac_address=48:A9:8A:C2:28:BF ` +
  `user_ip=10.121.124.50 nat_ip=160.187.175.26 ` +
  `src-address=10.121.124.50:51234 dst-address=8.8.8.8:53 protocol=udp`;

console.log("\nPOST /api/logs/receive (localhost)...");
const res = await fetch(`${localBase}/api/logs/receive`, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    "x-ingest-secret": secret,
    "x-router-ip": routerIp,
  },
  body: sampleLog,
});

const body = await res.text();
console.log("Status:", res.status);
console.log(body);

if (res.status === 403) {
  console.log("\n✗ 403 — x-ingest-secret does not match INGEST_SECRET in .env.production.local");
  process.exit(1);
}
if (!res.ok) {
  console.log("\n✗ Ingest failed — check DATABASE_URL and npm run db:migrate");
  process.exit(1);
}

console.log("\n✓ Ingest OK — check Dashboard → Logs (Last 7 days)");
console.log("\nMikroTik UDP path (no HTTP): MikroTik → 160.187.175.30:514 → isp-syslog-listener");
