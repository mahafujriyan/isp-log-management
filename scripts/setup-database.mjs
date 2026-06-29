#!/usr/bin/env node
/** @deprecated Use database/scripts/setup.mjs — thin wrapper for npm run db:setup */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("node", ["database/scripts/setup.mjs", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
