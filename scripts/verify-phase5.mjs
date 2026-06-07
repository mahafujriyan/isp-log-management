#!/usr/bin/env node
/**
 * PHASE 5 verification — authentication & RBAC
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
  "src/auth.ts",
  "src/auth.config.ts",
  "src/lib/auth.ts",
  "src/services/auth.service.ts",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/auth/login/page.tsx",
  "src/app/auth/super-admin/page.tsx",
  "src/middleware.ts",
  "src/constants/roles.constants.ts",
  "src/utils/rbac.utils.ts",
  "src/hooks/useRole.ts",
  "src/types/next-auth.d.ts",
  "docs/PHASE_5.md",
];

for (const f of files) {
  ok(`File: ${f}`, existsSync(join(root, f)));
}

const authSvc = readFileSync(join(root, "src/services/auth.service.ts"), "utf8");
ok("authenticateUser uses public.users", authSvc.includes("public.users"));
ok("bcrypt password verify", authSvc.includes("bcrypt.compare"));

const authConfig = readFileSync(join(root, "src/auth.config.ts"), "utf8");
ok("JWT role in token", authConfig.includes("token.role"));
ok("Session user id", authConfig.includes("session.user.id"));

const roles = readFileSync(join(root, "src/constants/roles.constants.ts"), "utf8");
ok("PERMISSIONS defined", roles.includes("export const PERMISSIONS"));

const rbac = readFileSync(join(root, "src/utils/rbac.utils.ts"), "utf8");
ok("hasPermission helper", rbac.includes("export function hasPermission"));

const apiUtils = readFileSync(join(root, "src/utils/api.utils.ts"), "utf8");
ok("requirePermission API guard", apiUtils.includes("export async function requirePermission"));

const logsRoute = readFileSync(join(root, "src/app/api/logs/route.ts"), "utf8");
ok("Logs API RBAC", logsRoute.includes('requirePermission("LOGS_READ")'));

const loginPage = readFileSync(join(root, "src/app/auth/login/page.tsx"), "utf8");
ok("Login page uses UserLoginForm", loginPage.includes("UserLoginForm"));

const loginForm = readFileSync(join(root, "src/components/auth/UserLoginForm.tsx"), "utf8");
ok("Login form signIn credentials", loginForm.includes('signIn("credentials"'));

const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
ok("Middleware protects admin", middleware.includes("ROUTES.admin"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("npm script verify:phase5", Boolean(pkg.scripts?.["verify:phase5"]));

const passed = checks.filter((c) => c.pass).length;
const total = checks.length;
console.log(`\nPHASE 5: ${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
