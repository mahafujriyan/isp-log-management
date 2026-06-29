#!/usr/bin/env node
/** Stop local Prisma Postgres server started by prisma-postgres-start.mjs */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_NAME = "isp-log-management";

spawnSync("npx", ["prisma", "dev", "stop", SERVER_NAME], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

console.log(`\n✓ Stopped Prisma Postgres (${SERVER_NAME})`);
