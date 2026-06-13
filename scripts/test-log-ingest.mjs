#!/usr/bin/env node
/**
 * Test log ingest on VPS or local
 * npm run test:log-ingest
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
const secret = process.env.INGEST_SECRET || "local-dev-secret-123";
const routerIp = process.env.TEST_ROUTER_IP || "160.187.175.26";

const sampleLog =
  `<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info ` +
  `pppoe_user=clc_test@cyberlink mac_address=48:A9:8A:C2:28:BF ` +
  `user_ip=10.121.124.50 nat_ip=160.187.175.26 ` +
  `src-address=10.121.124.50:51234 dst-address=8.8.8.8:53 protocol=udp`;

console.log("POST", `${base}/api/logs/receive`);
console.log("Router IP:", routerIp);

const res = await fetch(`${base}/api/logs/receive`, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    "x-ingest-secret": secret,
    "x-router-ip": routerIp,
  },
  body: sampleLog,
});

const text = await res.text();
console.log("Status:", res.status);
console.log(text);

if (!res.ok) process.exit(1);
console.log("\nOK — check dashboard Logs tab (Last 7 days, tenant_001)");
