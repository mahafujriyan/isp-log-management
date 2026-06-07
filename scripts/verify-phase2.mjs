#!/usr/bin/env node
/**
 * PHASE 2 verification — multi-tenant PostgreSQL schema
 */
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const checks = [];
function ok(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(pass ? "✓" : "✗", name, detail ? `— ${detail}` : "");
}

const files = [
  "scripts/sql/tenant-schema-function.sql",
  "scripts/phase2-migration.sql",
  "src/services/tenant.service.ts",
  "src/services/syslog.service.ts",
  "src/utils/schema.utils.ts",
  "src/app/api/plans/route.ts",
  "src/app/api/tenants/route.ts",
  "src/app/api/tenants/[id]/route.ts",
  "docs/PHASE_2.md",
];

for (const f of files) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const tenantFn = readFileSync(join(root, "scripts/sql/tenant-schema-function.sql"), "utf8");
ok("create_tenant_schema function", tenantFn.includes("CREATE OR REPLACE FUNCTION public.create_tenant_schema"));
ok("syslogs table in function", tenantFn.includes(".syslogs"));
ok("syslogs indexes", tenantFn.includes("idx_") && tenantFn.includes("received_at"));

const tenantSvc = readFileSync(join(root, "src/services/tenant.service.ts"), "utf8");
ok("createTenant service", tenantSvc.includes("export async function createTenant"));
ok("provisionTenantSchema", tenantSvc.includes("create_tenant_schema"));

const syslogSvc = readFileSync(join(root, "src/services/syslog.service.ts"), "utf8");
ok("resolveLogsQuery", syslogSvc.includes("export async function resolveLogsQuery"));
ok("getLogsAcrossTenants", syslogSvc.includes("export async function getLogsAcrossTenants"));

const logsRoute = readFileSync(join(root, "src/app/api/logs/route.ts"), "utf8");
ok("logs API uses resolveLogsQuery", logsRoute.includes("resolveLogsQuery"));

const tenantMgr = readFileSync(join(root, "src/components/admin/TenantManager.tsx"), "utf8");
ok("TenantManager create form", tenantMgr.includes("/api/plans") && tenantMgr.includes("POST"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("npm script db:phase2", Boolean(pkg.scripts?.["db:phase2"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 2: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
