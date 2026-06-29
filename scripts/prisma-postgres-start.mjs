#!/usr/bin/env node
/**
 * Start local Prisma Postgres (`npx prisma dev`) and write DATABASE_URL to .env.local.
 * The app uses `pg` + SQL scripts — Prisma is only the local Postgres server.
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTcpUrlFromPrismaLs, resolvePgDatabaseUrl, sanitizePostgresUrl } from "./lib/prisma-db-url.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_NAME = "isp-log-management";
const DEFAULT_DB_PORT = 51214;
const DEFAULT_URL = `postgres://postgres:postgres@localhost:${DEFAULT_DB_PORT}/template1?sslmode=disable`;

function prismaDevLs() {
  return spawnSync("npx", ["prisma", "dev", "ls"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function serverIsRunning() {
  const result = prismaDevLs();
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return out.includes(SERVER_NAME);
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function tryParseUrlFromPrismaLs() {
  const result = prismaDevLs();
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return (
    parseTcpUrlFromPrismaLs(out) ??
    resolvePgDatabaseUrl(out.match(/prisma\+postgres:\/\/[^\s"']+/i)?.[0]) ??
    null
  );
}

const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  const existing = fs.readFileSync(envPath, "utf8");
  const current = existing.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? "";
  if (current.includes("prisma.io")) {
    console.log("⚠ DATABASE_URL still points to Prisma hosted cloud (prisma.io).");
    console.log("  Switch to VPS PostgreSQL: deploy/vps-postgres-setup.sh");
    console.log("  Prisma Studio: npm run db:prisma:pull && npm run db:studio");
    console.log("  See: prisma/README.md\n");
    process.exit(0);
  }
  if (
    current.includes("127.0.0.1") ||
    current.includes("localhost") ||
    current.includes("isp_logserver")
  ) {
    console.log("✓ VPS/local PostgreSQL configured — `prisma dev` server not needed.");
    console.log("  Prisma Studio: npm run db:prisma:pull && npm run db:studio\n");
    process.exit(0);
  }
}

console.log(`Starting Prisma Postgres (name: ${SERVER_NAME})...\n`);

if (!serverIsRunning()) {
  console.log("Creating detached Prisma Postgres instance...");
  const create = spawnSync(
    "npx",
    ["prisma", "dev", "--detach", "--name", SERVER_NAME],
    { cwd: root, encoding: "utf8", stdio: "inherit", shell: process.platform === "win32" }
  );
  if (create.status !== 0) {
    console.error("\n✗ Failed to start Prisma Postgres. Run: npm install");
    process.exit(1);
  }
} else {
  console.log("✓ Prisma Postgres already running");
}

const databaseUrl =
  sanitizePostgresUrl(tryParseUrlFromPrismaLs()) ||
  DEFAULT_URL;
console.log(`\nDATABASE_URL:\n  ${databaseUrl}\n`);

const envPath = path.join(root, ".env.local");
let envContent = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(path.join(root, ".env.example"), "utf8");

envContent = upsertEnv(envContent, "DATABASE_URL", databaseUrl);
fs.writeFileSync(envPath, envContent);

execSync("node scripts/sync-env.mjs", { cwd: root, stdio: "inherit" });

console.log("✓ Updated .env.local and synced apps/*/.env.local");
console.log("\nHosted Prisma: data is stored in your cloud database (DATABASE_URL).");
console.log("Do NOT run db:prisma:start unless you want a separate local DB.");
console.log("\nNext:");
console.log("  npm run db:setup     # first time — create tables in cloud DB");
console.log("  npm run db:migrate   # apply extra migrations");
console.log("  npm run dev          # start portals");
