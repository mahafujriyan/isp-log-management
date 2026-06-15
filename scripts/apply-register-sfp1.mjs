#!/usr/bin/env node
import { createPgClient } from "./lib/db-utils.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, "register-router-sfp1.sql"), "utf8");
const client = createPgClient();

try {
  await client.connect();
  await client.query("SELECT public.create_tenant_schema('tenant_001')");
  await client.query(sql);
  console.log("✓ Registered router CLC-SFP1-NAT (160.187.175.26) in tenant_001.");
} catch (err) {
  console.error("✗ Register SFP1 failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
