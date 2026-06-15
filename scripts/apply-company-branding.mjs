#!/usr/bin/env node
import { runSqlFile } from "./lib/db-utils.mjs";

await runSqlFile("company-branding-migration.sql", "Company branding columns applied.");
