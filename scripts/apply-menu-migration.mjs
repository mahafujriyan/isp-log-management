#!/usr/bin/env node
import { runSqlFile } from "./lib/db-utils.mjs";

await runSqlFile("menu-migration.sql", "App menus migration applied.");
