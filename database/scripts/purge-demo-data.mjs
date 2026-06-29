#!/usr/bin/env node
/**
 * Remove demo sandbox tenant, fake devices, and seeded sample logs from production DB.
 */
import { createPgClient, getDatabaseUrl, runSqlFile } from "./lib/db-client.mjs";
import { PURGE_DEMO_FILE } from "../manifest.mjs";

async function main() {
  getDatabaseUrl();
  const client = createPgClient();
  await client.connect();

  console.log("Purging demo/fake data from database...");
  try {
    await runSqlFile(client, PURGE_DEMO_FILE);
    console.log("Done — only real production data remains.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
