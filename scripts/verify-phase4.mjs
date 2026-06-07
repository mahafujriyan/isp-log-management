#!/usr/bin/env node
/**
 * PHASE 4 verification — API routes & backend services
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

const routes = [
  "src/app/api/tenants/route.ts",
  "src/app/api/tenants/[id]/route.ts",
  "src/app/api/logs/route.ts",
  "src/app/api/devices/route.ts",
  "src/app/api/plans/route.ts",
  "src/app/api/users/route.ts",
  "src/app/api/dashboard/metrics/route.ts",
  "src/app/api/health/route.ts",
];

const services = [
  "src/services/tenant.service.ts",
  "src/services/syslog.service.ts",
  "src/services/device.service.ts",
  "src/services/dashboard.service.ts",
  "src/services/user.service.ts",
  "src/utils/api.utils.ts",
  "docs/PHASE_4.md",
];

for (const f of [...routes, ...services]) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const tenantsRoute = readFileSync(join(root, "src/app/api/tenants/route.ts"), "utf8");
ok("Tenants GET uses service", tenantsRoute.includes("listTenants"));
ok("Tenants POST uses createTenant", tenantsRoute.includes("createTenant"));

const logsRoute = readFileSync(join(root, "src/app/api/logs/route.ts"), "utf8");
ok("Logs GET uses resolveLogsQuery", logsRoute.includes("resolveLogsQuery"));
ok("Logs supports tenantId alias", logsRoute.includes("tenantId"));
ok("Logs POST ingest", logsRoute.includes("ingestLogs"));

const metricsRoute = readFileSync(join(root, "src/app/api/dashboard/metrics/route.ts"), "utf8");
ok("Metrics uses live service", metricsRoute.includes("getLiveDashboardMetrics"));

const syslogSvc = readFileSync(join(root, "src/services/syslog.service.ts"), "utf8");
ok("ingestLogs service", syslogSvc.includes("export async function ingestLogs"));

const deviceSvc = readFileSync(join(root, "src/services/device.service.ts"), "utf8");
ok("createTenantDevice service", deviceSvc.includes("export async function createTenantDevice"));

const devicesRoute = readFileSync(join(root, "src/app/api/devices/route.ts"), "utf8");
ok("Devices API route", devicesRoute.includes("resolveDevicesQuery"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("npm script verify:phase4", Boolean(pkg.scripts?.["verify:phase4"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 4: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
