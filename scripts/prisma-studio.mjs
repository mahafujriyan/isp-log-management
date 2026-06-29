#!/usr/bin/env node
/**
 * Prisma Studio — browse VPS/local PostgreSQL data.
 * Requires: npm run db:prisma:pull (once, after schema changes)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { loadPrismaEnv } from "./prisma-env.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");

loadPrismaEnv();

const schema = fs.readFileSync(schemaPath, "utf8");
if (!schema.includes("model ")) {
  console.error("prisma/schema.prisma has no models yet.");
  console.error("Run first: npm run db:prisma:pull");
  process.exit(1);
}

console.log("Starting Prisma Studio →", process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@"));
console.log("Press Ctrl+C to stop.\n");

const child = spawn("npx", ["prisma", "studio"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
