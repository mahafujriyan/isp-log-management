#!/usr/bin/env node
/**
 * PHASE 3 verification — dashboard UI components
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
  "src/components/shared/Sidebar.tsx",
  "src/components/shared/NavLink.tsx",
  "src/components/dashboard/MetricCard.tsx",
  "src/components/dashboard/DashboardLayout.tsx",
  "src/components/dashboard/DashboardOverview.tsx",
  "src/components/dashboard/DashboardHeader.tsx",
  "src/components/dashboard/DashboardApp.tsx",
  "src/components/dashboard/LogsTable.tsx",
  "src/components/dashboard/DashboardCharts.tsx",
  "src/components/dashboard/index.ts",
  "src/components/shared/index.ts",
  "src/app/dashboard/page.tsx",
  "docs/PHASE_3.md",
];

for (const f of files) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const sidebar = readFileSync(join(root, "src/components/shared/Sidebar.tsx"), "utf8");
ok("Sidebar exports Sidebar", sidebar.includes("export function Sidebar"));
ok("Sidebar uses NavLink", sidebar.includes("NavLink"));

const metric = readFileSync(join(root, "src/components/dashboard/MetricCard.tsx"), "utf8");
ok("MetricCard component", metric.includes("export function MetricCard"));
ok("MetricCard supports title prop", metric.includes("title"));

const layout = readFileSync(join(root, "src/components/dashboard/DashboardLayout.tsx"), "utf8");
ok("DashboardLayout shell", layout.includes("export function DashboardLayout"));
ok("DashboardLayout uses Sidebar", layout.includes("Sidebar"));

const overview = readFileSync(join(root, "src/components/dashboard/DashboardOverview.tsx"), "utf8");
ok("DashboardOverview metrics grid", overview.includes("MetricCard"));

const page = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
ok("Dashboard page uses DashboardApp", page.includes("DashboardApp"));

const app = readFileSync(join(root, "src/components/dashboard/DashboardApp.tsx"), "utf8");
ok("DashboardApp uses DashboardLayout", app.includes("DashboardLayout"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("npm script verify:phase3", Boolean(pkg.scripts?.["verify:phase3"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 3: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
