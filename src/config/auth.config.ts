import type { DemoUser } from "@/types/auth.types";
import { env } from "@/config/env.config";
import { ROUTES } from "@/constants/routes.constants";

export const AUTH_CONFIG = {
  pages: {
    signIn: ROUTES.auth.login,
    superAdmin: ROUTES.auth.superAdmin,
    dashboard: ROUTES.dashboard,
    admin: ROUTES.admin,
  },
  session: {
    strategy: "jwt" as const,
    maxAge: env.auth.sessionMaxAge,
  },
  demoUsers: [
    {
      email: "admin@cyberlink.com",
      password: "Admin@123456",
      username: "operator1",
      role: "operator",
    },
    {
      email: "superadmin@cyberlink.com",
      password: "Super@Secure2026!",
      username: "admin",
      role: "super_admin",
    },
  ] satisfies DemoUser[],
};

export function getSuperAdminSecurityCode(): string {
  return env.auth.superAdminCode;
}
