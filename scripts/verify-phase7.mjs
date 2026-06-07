#!/usr/bin/env node
/**
 * PHASE 7 verification — production deployment setup
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
  "next.config.ts",
  "deploy/ecosystem.config.cjs",
  "deploy/nginx/logserver.conf",
  "deploy/.env.production.example",
  "docs/PHASE_7.md",
];

for (const f of files) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
ok("reactStrictMode", nextConfig.includes("reactStrictMode: true"));
ok("compress enabled", nextConfig.includes("compress: true"));
ok("poweredByHeader disabled", nextConfig.includes("poweredByHeader: false"));
ok("security headers", nextConfig.includes("X-Content-Type-Options"));

const pm2 = readFileSync(join(root, "deploy/ecosystem.config.cjs"), "utf8");
ok("PM2 app name isp-logserver", pm2.includes("isp-logserver"));

const nginx = readFileSync(join(root, "deploy/nginx/logserver.conf"), "utf8");
ok("Nginx proxy_pass", nginx.includes("proxy_pass"));
ok("Nginx Host header", nginx.includes("proxy_set_header Host"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("build script", Boolean(pkg.scripts?.build));
ok("start script", Boolean(pkg.scripts?.start));
ok("npm script verify:phase7", Boolean(pkg.scripts?.["verify:phase7"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 7: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
