#!/usr/bin/env node
import { runSqlFile } from "./lib/db-utils.mjs";

await runSqlFile("mikrotik-syslog-migration.sql", "MikroTik syslog migration applied.");
