#!/usr/bin/env node
/**
 * Apply pending versioned migrations (idempotent).
 * Usage: npm run db:migrate
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPgClient,
  ensureMigrationsTable,
  getDatabaseUrl,
  isMigrationApplied,
  recordMigration,
  runSql,
  runSqlFile,
} from "./lib/db-client.mjs";
import { MIGRATION_VERSIONS } from "../manifest.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function main() {
  getDatabaseUrl();
  const client = createPgClient();
  await client.connect();

  console.log("Applying database migrations...\n");
  let applied = 0;

  try {
    await ensureMigrationsTable(client);

    for (const migration of MIGRATION_VERSIONS) {
      if (await isMigrationApplied(client, migration.version)) {
        console.log(`  ○ ${migration.version} (already applied)`);
        continue;
      }

      console.log(`>> ${migration.version} — ${migration.description}`);

      if (migration.files) {
        for (const file of migration.files) {
          await runSqlFile(client, file, file);
        }
      }
      if (migration.sql) {
        await runSql(client, migration.sql, migration.version);
      }

      await recordMigration(client, migration.version);
      applied += 1;
      console.log(`  ✓ ${migration.version}\n`);
    }

    // Operational sync steps (devices → router map)
    console.log(">> sync devices → router_tenant_map");
    execSync("node scripts/sync-router-map.mjs", { cwd: repoRoot, stdio: "inherit" });

    console.log(applied > 0 ? "\n✓ Migrations complete." : "\n✓ Database already up to date.");
  } catch (error) {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
