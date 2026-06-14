#!/usr/bin/env node
/**
 * Sync root .env.local → each app with portal-specific AUTH URLs.
 * Next.js loads env from each app folder, not monorepo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, ".env.local");

if (!fs.existsSync(source)) {
  console.error("❌ Missing .env.local at repo root. Copy from .env.example first.");
  process.exit(1);
}

const base = fs.readFileSync(source, "utf8");

function upsert(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.trim()}\n${line}\n`;
}

const shared = upsert(
  upsert(
    upsert(
      upsert(base, "NEXT_PUBLIC_MARKETING_URL", "http://localhost:3000"),
      "NEXT_PUBLIC_ADMIN_URL",
      "http://localhost:3001"
    ),
    "NEXT_PUBLIC_OPERATOR_URL",
    "http://localhost:3002"
  ),
  "NEXT_PUBLIC_API_URL",
  "http://localhost:3002"
);

const targets = [
  {
    dir: "apps/marketing",
    patch: (c) =>
      upsert(upsert(c, "NEXT_PUBLIC_APP_URL", "http://localhost:3000"), "AUTH_COOKIE_SECURE", "false"),
  },
  {
    dir: "apps/super-admin",
    patch: (c) => {
      let out = shared;
      out = upsert(out, "AUTH_URL", "http://localhost:3001");
      out = upsert(out, "NEXTAUTH_URL", "http://localhost:3001");
      out = upsert(out, "AUTH_ADMIN_URL", "http://localhost:3001");
      out = upsert(out, "NEXT_PUBLIC_APP_URL", "http://localhost:3001");
      return upsert(out, "AUTH_COOKIE_SECURE", "false");
    },
  },
  {
    dir: "apps/operator",
    patch: (c) => {
      let out = shared;
      out = upsert(out, "AUTH_URL", "http://localhost:3002");
      out = upsert(out, "NEXTAUTH_URL", "http://localhost:3002");
      out = upsert(out, "AUTH_OPERATOR_URL", "http://localhost:3002");
      out = upsert(out, "NEXT_PUBLIC_APP_URL", "http://localhost:3002");
      out = upsert(out, "NEXT_PUBLIC_SOCKET_URL", "http://localhost:3001");
      return upsert(out, "AUTH_COOKIE_SECURE", "false");
    },
  },
];

for (const { dir, patch } of targets) {
  const dest = path.join(root, dir, ".env.local");
  fs.writeFileSync(dest, patch(shared));
  console.log(`✓ synced ${dir}/.env.local`);
}
