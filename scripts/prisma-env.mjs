/**
 * Load DATABASE_URL for Prisma CLI (Studio, db pull, etc.)
 * Uses VPS/local PostgreSQL — NOT Prisma hosted cloud.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePgDatabaseUrl } from "./lib/prisma-db-url.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadPrismaEnv() {
  for (const file of [".env.production.local", ".env.local", ".env"]) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }

  const raw = process.env.DATABASE_URL;
  const resolved = resolvePgDatabaseUrl(raw);
  if (resolved) process.env.DATABASE_URL = resolved;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set.");
    console.error("  VPS: copy from .db-credentials after deploy/vps-postgres-setup.sh");
    console.error("  Local: .env.local → postgresql://isp_loguser:pass@localhost:5432/isp_logserver");
    process.exit(1);
  }

  if (process.env.DATABASE_URL.includes("prisma.io")) {
    console.warn(
      "\n⚠ DATABASE_URL points to Prisma hosted cloud (prisma.io)."
    );
    console.warn("  Use VPS PostgreSQL instead — see deploy/VPS-POSTGRES.md\n");
  }

  return process.env.DATABASE_URL;
}

export function isVpsOrLocalPostgres(url = process.env.DATABASE_URL ?? "") {
  return (
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    url.includes("160.187.175.30") ||
    (!url.includes("prisma.io") && /^postgres(?:ql)?:\/\//i.test(url))
  );
}
