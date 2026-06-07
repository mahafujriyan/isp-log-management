#!/usr/bin/env node
/**
 * PHASE 8 verification — MikroTik metrics & dynamic charts
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
  "scripts/phase8-migration.sql",
  "src/utils/mikrotik-parser.utils.ts",
  "src/lib/mikrotik-parser.ts",
  "src/services/metrics.service.ts",
  "src/app/api/metrics/route.ts",
  "src/app/api/admin/metrics/route.ts",
  "src/components/dashboard/DynamicChart.tsx",
  "src/components/dashboard/AnalyticsPage.tsx",
  "src/app/admin/metrics/page.tsx",
  "docs/PHASE_8.md",
];

for (const f of files) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const parser = readFileSync(join(root, "src/utils/mikrotik-parser.utils.ts"), "utf8");
ok("parseMikroTikLog", parser.includes("export function parseMikroTikLog"));
ok("aggregateMetrics", parser.includes("export function aggregateMetrics"));

const metricsSvc = readFileSync(join(root, "src/services/metrics.service.ts"), "utf8");
ok("getVisibleMetricsWithData", metricsSvc.includes("export async function getVisibleMetricsWithData"));

const sidebar = readFileSync(join(root, "src/components/shared/Sidebar.tsx"), "utf8");
ok("Analytics sidebar nav", sidebar.includes('"analytics"'));

const dashboard = readFileSync(join(root, "src/components/dashboard/DashboardApp.tsx"), "utf8");
ok("Analytics page in dashboard", dashboard.includes("AnalyticsPage"));

const dynamic = readFileSync(join(root, "src/components/dashboard/DynamicChart.tsx"), "utf8");
ok("DynamicChart line/bar/pie", dynamic.includes('type === "line"') && dynamic.includes('type === "pie"'));

const sql = readFileSync(join(root, "scripts/phase8-migration.sql"), "utf8");
ok("metrics table", sql.includes("CREATE TABLE IF NOT EXISTS public.metrics"));
ok("default metrics seed", sql.includes("'bandwidth'"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("npm script db:phase8", Boolean(pkg.scripts?.["db:phase8"]));
ok("npm script verify:phase8", Boolean(pkg.scripts?.["verify:phase8"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 8: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
