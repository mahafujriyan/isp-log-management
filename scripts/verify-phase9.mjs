#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;

function pass(label) {
  passed++;
  console.log(`✓ ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("PHASE 9 verification\n");

if (exists("src/components/marketing/LandingPage.tsx")) pass("Landing page component");
else fail("Landing page component");

if (read("src/app/page.tsx").includes("LandingPage")) pass("Home route uses landing page");
else fail("Home route uses landing page");

for (const route of [
  "src/app/admin/login/page.tsx",
  "src/app/admin/(portal)/page.tsx",
  "src/app/admin/(portal)/tenants/page.tsx",
  "src/app/admin/(portal)/metrics/page.tsx",
  "src/app/admin/(portal)/billing/page.tsx",
  "src/app/admin/(portal)/settings/page.tsx",
  "src/app/operator/page.tsx",
  "src/app/operator/logs/page.tsx",
  "src/app/operator/users/page.tsx",
  "src/app/operator/reports/page.tsx",
]) {
  if (exists(route)) pass(`Route ${route.replace("src/app/", "")}`);
  else fail(`Route ${route.replace("src/app/", "")}`);
}

if (exists("src/components/admin/AdminPortalLayout.tsx")) pass("Admin portal layout");
else fail("Admin portal layout");

if (exists("src/components/operator/OperatorPortalLayout.tsx")) pass("Operator portal layout");
else fail("Operator portal layout");

const pkg = JSON.parse(read("package.json"));
if (pkg.dependencies?.["framer-motion"]) pass("framer-motion installed");
else fail("framer-motion installed");

if (pkg.dependencies?.["embla-carousel-react"] || pkg.devDependencies?.["embla-carousel-react"]) {
  pass("embla-carousel installed");
} else fail("embla-carousel installed");

if (read("src/middleware.ts").includes("PORTAL_ROUTES")) pass("Middleware multi-portal rules");
else fail("Middleware multi-portal rules");

if (exists("docs/PHASE_9.md")) pass("PHASE_9 docs");
else fail("PHASE_9 docs");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
