#!/usr/bin/env node
/**
 * PHASE 6 verification — admin panel & tenant management
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
  "src/app/admin/page.tsx",
  "src/components/admin/AdminDashboard.tsx",
  "src/components/admin/AdminLayout.tsx",
  "src/components/admin/AdminStats.tsx",
  "src/components/admin/PlansOverview.tsx",
  "src/components/admin/TenantManager.tsx",
  "src/components/admin/index.ts",
  "docs/PHASE_6.md",
];

for (const f of files) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const adminPage = readFileSync(join(root, "src/app/admin/page.tsx"), "utf8");
ok("Admin page uses AdminDashboard", adminPage.includes("AdminDashboard"));

const dashboard = readFileSync(join(root, "src/components/admin/AdminDashboard.tsx"), "utf8");
ok("AdminDashboard composes layout", dashboard.includes("AdminLayout"));
ok("AdminDashboard has AdminStats", dashboard.includes("AdminStats"));
ok("AdminDashboard has TenantManager", dashboard.includes("TenantManager"));

const stats = readFileSync(join(root, "src/components/admin/AdminStats.tsx"), "utf8");
ok("Total tenants metric", stats.includes("Total Tenants"));
ok("Active tenants metric", stats.includes("Active"));
ok("Suspended tenants metric", stats.includes("Suspended"));

const tenantMgr = readFileSync(join(root, "src/components/admin/TenantManager.tsx"), "utf8");
ok("Tenant create form", tenantMgr.includes('method: "POST"') || tenantMgr.includes("POST"));
ok("Tenant status PATCH", tenantMgr.includes('method: "PATCH"') || tenantMgr.includes("PATCH"));
ok("Created date column", tenantMgr.includes("created_at"));

const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
ok("Admin route protected", middleware.includes("ROUTES.admin"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("npm script verify:phase6", Boolean(pkg.scripts?.["verify:phase6"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 6: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
