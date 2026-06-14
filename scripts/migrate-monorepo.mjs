#!/usr/bin/env node
/**
 * Monorepo migration: moves src/ into packages/ + apps/ and rewrites imports.
 * Run once: node scripts/migrate-monorepo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isFile()) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    return;
  }
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function moveDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(src, dest);
}

function walkFiles(dir, ext = [".ts", ".tsx"], out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next") {
      walkFiles(full, ext, out);
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const IMPORT_MAP = [
  [/from "@\/config\/([^"]+)"/g, 'from "@isp/core/config/$1"'],
  [/from "@\/config"/g, 'from "@isp/core/config"'],
  [/from "@\/constants\/([^"]+)"/g, 'from "@isp/core/constants/$1"'],
  [/from "@\/constants"/g, 'from "@isp/core/constants"'],
  [/from "@\/types\/([^"]+)"/g, 'from "@isp/core/types/$1"'],
  [/from "@\/types"/g, 'from "@isp/core/types"'],
  [/from "@\/utils\/([^"]+)"/g, 'from "@isp/core/utils/$1"'],
  [/from "@\/utils"/g, 'from "@isp/core/utils"'],
  [/from "@\/services\/([^"]+)"/g, 'from "@isp/core/services/$1"'],
  [/from "@\/services"/g, 'from "@isp/core/services"'],
  [/from "@\/lib\/([^"]+)"/g, 'from "@isp/core/lib/$1"'],
  [/from "@\/lib"/g, 'from "@isp/core/lib"'],
  [/from "@\/hooks\/([^"]+)"/g, 'from "@isp/auth/hooks/$1"'],
  [/from "@\/auth\.edge"/g, 'from "@isp/auth/edge"'],
  [/from "@\/auth\.config"/g, 'from "@isp/auth/config"'],
  [/from "@\/auth"/g, 'from "@isp/auth"'],
  [/from "@\/components\/shared\/([^"]+)"/g, 'from "@isp/ui/$1"'],
  [/from "@\/components\/shared"/g, 'from "@isp/ui"'],
  [/from "@\/components\/marketing\/([^"]+)"/g, 'from "@isp/features/marketing/components/$1"'],
  [/from "@\/components\/admin\/([^"]+)"/g, 'from "@isp/features/admin/components/$1"'],
  [/from "@\/components\/admin"/g, 'from "@isp/features/admin"'],
  [/from "@\/components\/operator\/([^"]+)"/g, 'from "@isp/features/operator/components/$1"'],
  [/from "@\/components\/auth\/([^"]+)"/g, 'from "@isp/features/auth/components/$1"'],
  [/from "@\/components\/providers\/([^"]+)"/g, 'from "@isp/features/auth/components/$1"'],
  [/from "@\/components\/log-stream\/([^"]+)"/g, 'from "@isp/features/logs/$1"'],
  [/from "@\/components\/log-stream"/g, 'from "@isp/features/logs"'],
  [/from "@\/components\/btrc\/([^"]+)"/g, 'from "@isp/features/btrc/components/$1"'],
  [/from "@\/components\/dashboard\/([^"]+)"/g, 'from "@isp/features/console/components/$1"'],
  [/from "@\/components\/dashboard"/g, 'from "@isp/features/console"'],
  [/import\("@\/services\/([^"]+)"\)/g, 'import("@isp/core/services/$1")'],
  [/import\("@\/config\/([^"]+)"\)/g, 'import("@isp/core/config/$1")'],
];

function rewriteImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;
  for (const [pattern, replacement] of IMPORT_MAP) {
    const next = content.replace(pattern, replacement);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, "utf8");
}

function migrateCore() {
  const core = path.join(ROOT, "packages/core/src");
  ensureDir(core);
  const moves = ["config", "constants", "types", "utils", "lib"];
  for (const dir of moves) {
    moveDir(path.join(ROOT, "src", dir), path.join(core, dir));
  }
  // services except syslog-listener
  const servicesSrc = path.join(ROOT, "src/services");
  const servicesDest = path.join(core, "services");
  ensureDir(servicesDest);
  if (fs.existsSync(servicesSrc)) {
    for (const entry of fs.readdirSync(servicesSrc, { withFileTypes: true })) {
      if (entry.name === "syslog-listener") continue;
      const s = path.join(servicesSrc, entry.name);
      const d = path.join(servicesDest, entry.name);
      if (entry.isDirectory()) moveDir(s, d);
      else fs.renameSync(s, d);
    }
    if (fs.existsSync(servicesSrc) && fs.readdirSync(servicesSrc).length === 0) {
      fs.rmdirSync(servicesSrc);
    }
  }
  // useHealthCheck hook -> core/hooks
  const hookSrc = path.join(ROOT, "src/hooks/useHealthCheck.ts");
  if (fs.existsSync(hookSrc)) {
    ensureDir(path.join(core, "hooks"));
    moveDir(hookSrc, path.join(core, "hooks/useHealthCheck.ts"));
  }
}

function migrateAuth() {
  const auth = path.join(ROOT, "packages/auth/src");
  ensureDir(auth);
  const files = ["auth.ts", "auth.config.ts", "auth.edge.ts"];
  for (const f of files) {
    const s = path.join(ROOT, "src", f);
    if (fs.existsSync(s)) moveDir(s, path.join(auth, f));
  }
  const libAuth = path.join(ROOT, "src/lib/auth.ts");
  if (fs.existsSync(libAuth)) {
    ensureDir(path.join(auth, "lib"));
    moveDir(libAuth, path.join(auth, "lib/auth.ts"));
  }
  const useRole = path.join(ROOT, "src/hooks/useRole.ts");
  if (fs.existsSync(useRole)) {
    ensureDir(path.join(auth, "hooks"));
    moveDir(useRole, path.join(auth, "hooks/useRole.ts"));
  }
}

function migrateUi() {
  const ui = path.join(ROOT, "packages/ui/src");
  const shared = path.join(ROOT, "src/components/shared");
  if (fs.existsSync(shared)) moveDir(shared, ui);
}

function migrateFeatures() {
  const feat = path.join(ROOT, "packages/features/src");
  const mappings = [
    ["src/components/marketing", "marketing/components"],
    ["src/components/admin", "admin/components"],
    ["src/components/operator", "operator/components"],
    ["src/components/auth", "auth/components"],
    ["src/components/providers", "auth/components"],
    ["src/components/btrc", "btrc/components"],
    ["src/components/log-stream", "logs"],
    ["src/components/dashboard", "console/components"],
  ];
  for (const [src, dest] of mappings) {
    const s = path.join(ROOT, src);
    const d = path.join(feat, dest);
    if (fs.existsSync(s)) {
      ensureDir(path.dirname(d));
      moveDir(s, d);
    }
  }
  // Split console components into feature barrels (copy refs via index files later)
  createFeatureIndexes(feat);
}

function createFeatureIndexes(featRoot) {
  const featureDirs = [
    "logs",
    "marketing",
    "admin",
    "operator",
    "auth",
    "console",
    "btrc",
  ];
  for (const name of featureDirs) {
    const dir = path.join(featRoot, name);
    if (!fs.existsSync(dir)) continue;
    const indexPath = path.join(dir, "index.ts");
    if (fs.existsSync(indexPath)) continue;
    const exports = [];
    const compDir = fs.existsSync(path.join(dir, "components"))
      ? path.join(dir, "components")
      : dir;
    for (const f of fs.readdirSync(compDir)) {
      if (f.endsWith(".tsx") || (f.endsWith(".ts") && !f.endsWith(".d.ts"))) {
        const base = f.replace(/\.tsx?$/, "");
        const rel = fs.existsSync(path.join(dir, "components")) ? `./components/${base}` : `./${base}`;
        exports.push(`export * from "${rel}";`);
      }
    }
    if (exports.length) fs.writeFileSync(indexPath, exports.join("\n") + "\n");
  }
  // Device-related from console -> devices index re-export
  const devicesDir = path.join(featRoot, "devices");
  ensureDir(devicesDir);
  fs.writeFileSync(
    path.join(devicesDir, "index.ts"),
    `export { DeviceManagerPanel } from "../console/components/DeviceManagerPanel";\nexport { DisabledDevicesPanel } from "../console/components/DisabledDevicesPanel";\n`
  );
  const tenantsDir = path.join(featRoot, "tenants");
  ensureDir(tenantsDir);
  fs.writeFileSync(
    path.join(tenantsDir, "index.ts"),
    `export { TenantManager } from "../admin/components/TenantManager";\n`
  );
  const billingDir = path.join(featRoot, "billing");
  ensureDir(billingDir);
  fs.writeFileSync(
    path.join(billingDir, "index.ts"),
    `export { PlansOverview } from "../admin/components/PlansOverview";\nexport { PlanManagerPanel } from "../admin/components/PlanManagerPanel";\n`
  );
  const metricsDir = path.join(featRoot, "metrics");
  ensureDir(metricsDir);
  fs.writeFileSync(
    path.join(metricsDir, "index.ts"),
    `export { MetricConfigPanel } from "../admin/components/MetricConfigPanel";\nexport { MetricCard } from "../console/components/MetricCard";\nexport { DynamicChart } from "../console/components/DynamicChart";\nexport { DashboardCharts } from "../console/components/DashboardCharts";\n`
  );
  const demoDir = path.join(featRoot, "demo-requests");
  ensureDir(demoDir);
  fs.writeFileSync(
    path.join(demoDir, "index.ts"),
    `export { DemoRequestsPanel } from "../admin/components/DemoRequestsPanel";\nexport { DemoRequestModal } from "../marketing/components/DemoRequestModal";\n`
  );
  const settingsDir = path.join(featRoot, "settings");
  ensureDir(settingsDir);
  fs.writeFileSync(
    path.join(settingsDir, "index.ts"),
    `export { CompanySettingsPanel } from "../console/components/CompanySettingsPanel";\nexport { OperatorAccountSettings } from "../operator/components/OperatorAccountSettings";\n`
  );
}

function migrateSyslogWorker() {
  const src = path.join(ROOT, "src/services/syslog-listener");
  const dest = path.join(ROOT, "workers/syslog-listener/src");
  if (fs.existsSync(src)) moveDir(src, dest);
}

function migrateApps() {
  const appSrc = path.join(ROOT, "src/app");
  if (!fs.existsSync(appSrc)) return;

  // Marketing
  const marketingApp = path.join(ROOT, "apps/marketing/src/app");
  ensureDir(marketingApp);
  copyDir(path.join(appSrc, "globals.css"), path.join(marketingApp, "globals.css"));
  fs.copyFileSync(path.join(appSrc, "page.tsx"), path.join(marketingApp, "page.tsx"));
  fs.copyFileSync(path.join(appSrc, "layout.tsx"), path.join(marketingApp, "layout.tsx"));

  // Super Admin
  const adminApp = path.join(ROOT, "apps/super-admin/src/app");
  ensureDir(adminApp);
  copyDir(path.join(appSrc, "globals.css"), path.join(adminApp, "globals.css"));
  copyDir(path.join(appSrc, "admin"), path.join(adminApp, "admin"));
  if (fs.existsSync(path.join(appSrc, "auth/super-admin"))) {
    ensureDir(path.join(adminApp, "auth"));
    copyDir(path.join(appSrc, "auth/super-admin"), path.join(adminApp, "auth/super-admin"));
  }
  // auth API route in super-admin
  ensureDir(path.join(adminApp, "api/auth/[...nextauth]"));
  if (fs.existsSync(path.join(appSrc, "api/auth/[...nextauth]/route.ts"))) {
    copyDir(
      path.join(appSrc, "api/auth/[...nextauth]/route.ts"),
      path.join(adminApp, "api/auth/[...nextauth]/route.ts")
    );
  }

  // Operator (+ all API)
  const operatorApp = path.join(ROOT, "apps/operator/src/app");
  ensureDir(operatorApp);
  copyDir(path.join(appSrc, "globals.css"), path.join(operatorApp, "globals.css"));
  copyDir(path.join(appSrc, "operator"), path.join(operatorApp, "operator"));
  copyDir(path.join(appSrc, "dashboard"), path.join(operatorApp, "dashboard"));
  if (fs.existsSync(path.join(appSrc, "auth/login"))) {
    ensureDir(path.join(operatorApp, "auth"));
    copyDir(path.join(appSrc, "auth/login"), path.join(operatorApp, "auth/login"));
  }
  copyDir(path.join(appSrc, "api"), path.join(operatorApp, "api"));
  if (fs.existsSync(path.join(appSrc, "api/auth/[...nextauth]/route.ts"))) {
    ensureDir(path.join(operatorApp, "api/auth/[...nextauth]"));
    copyDir(
      path.join(appSrc, "api/auth/[...nextauth]/route.ts"),
      path.join(operatorApp, "api/auth/[...nextauth]/route.ts")
    );
  }

  // middleware copies
  if (fs.existsSync(path.join(ROOT, "src/middleware.ts"))) {
    fs.copyFileSync(path.join(ROOT, "src/middleware.ts"), path.join(ROOT, "apps/operator/src/middleware.ts"));
    fs.copyFileSync(path.join(ROOT, "src/middleware.ts"), path.join(ROOT, "apps/super-admin/src/middleware-admin.ts"));
  }

  // operator layout.tsx (root)
  fs.writeFileSync(
    path.join(operatorApp, "layout.tsx"),
    fs.readFileSync(path.join(appSrc, "layout.tsx"), "utf8")
  );
  fs.writeFileSync(
    path.join(adminApp, "layout.tsx"),
    fs.readFileSync(path.join(appSrc, "layout.tsx"), "utf8")
  );
  fs.writeFileSync(
    path.join(marketingApp, "layout.tsx"),
    fs.readFileSync(path.join(appSrc, "layout.tsx"), "utf8").replace(
      "AuthProvider",
      "AuthProvider"
    )
  );
}

function createCoreIndex() {
  const indexPath = path.join(ROOT, "packages/core/src/index.ts");
  fs.writeFileSync(
    indexPath,
    `export * from "./config";
export * from "./constants";
export * from "./types";
export * from "./utils";
export * from "./services";
`
  );
}

function createAuthIndex() {
  const indexPath = path.join(ROOT, "packages/auth/src/index.ts");
  fs.writeFileSync(
    indexPath,
    `export { auth, signIn, signOut, handlers } from "./auth";
export { nextAuthConfig } from "./config";
`
  );
}

function rewriteAll() {
  const dirs = [
    path.join(ROOT, "packages"),
    path.join(ROOT, "apps"),
    path.join(ROOT, "workers"),
  ];
  for (const dir of dirs) {
    for (const file of walkFiles(dir)) {
      rewriteImports(file);
    }
  }
}

function main() {
  console.log("Migrating to monorepo...");
  migrateCore();
  migrateAuth();
  migrateUi();
  migrateFeatures();
  migrateSyslogWorker();
  migrateApps();
  createCoreIndex();
  createAuthIndex();
  rewriteAll();
  console.log("Migration complete. Run npm install && npm run build:operator");
}

main();
