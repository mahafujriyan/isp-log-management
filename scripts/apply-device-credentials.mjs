#!/usr/bin/env node
import { runSqlFile } from "./lib/db-utils.mjs";

await runSqlFile("device-credentials-migration.sql", "Device credentials columns applied.");
