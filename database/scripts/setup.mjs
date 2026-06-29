#!/usr/bin/env node
/**
 * Fresh database install: public schema + tenant functions + seeds.
 * Usage: npm run db:setup
 */
import {
  createPgClient,
  ensureMigrationsTable,
  getDatabaseUrl,
  recordMigration,
  runSqlFile,
} from "./lib/db-client.mjs";
import {
  MIGRATION_VERSIONS,
  PUBLIC_SCHEMA_FILES,
  SEED_FILES,
  TENANT_SCHEMA_FILES,
} from "../manifest.mjs";

const withSeeds = process.argv.includes("--no-seeds") ? false : true;

async function main() {
  getDatabaseUrl();
  const client = createPgClient();
  await client.connect();

  console.log("Applying database schema...\n");

  try {
    await ensureMigrationsTable(client);

    for (const file of PUBLIC_SCHEMA_FILES) {
      await runSqlFile(client, file);
    }
    console.log("  ✓ public schema");

    for (const file of TENANT_SCHEMA_FILES) {
      await runSqlFile(client, file);
    }
    console.log("  ✓ tenant functions");

    if (withSeeds) {
      for (const file of SEED_FILES) {
        await runSqlFile(client, file);
      }
      console.log("  ✓ seeds");
    }

    for (const m of MIGRATION_VERSIONS) {
      await recordMigration(client, m.version);
    }

    const checks = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.plans) AS plans,
        (SELECT COUNT(*)::int FROM public.tenants) AS tenants,
        (SELECT COUNT(*)::int FROM public.metrics) AS metrics,
        (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS public_tables
    `);
    const row = checks.rows[0];
    console.log(`\n✓ Database setup complete`);
    console.log(`  plans: ${row.plans}, tenants: ${row.tenants}, metrics: ${row.metrics}, public tables: ${row.public_tables}`);
  } catch (error) {
    console.error("Setup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
