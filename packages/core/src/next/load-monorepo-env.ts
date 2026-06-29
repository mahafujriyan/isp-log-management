import path from "path";
import { loadEnvConfig } from "@next/env";

export type MonorepoPortal = "marketing" | "super-admin" | "operator";

const PORTS: Record<MonorepoPortal, number> = {
  marketing: 3000,
  "super-admin": 3001,
  operator: 3002,
};

/**
 * Load root `.env.local` then apply per-portal defaults for local dev.
 * Call at top of each app's next.config.ts.
 */
export function loadMonorepoEnv(appDirname: string, portal: MonorepoPortal) {
  const root = path.join(appDirname, "../..");
  loadEnvConfig(root);

  const port = PORTS[portal];
  const portalUrl = `http://localhost:${port}`;

  process.env.NEXT_PUBLIC_MARKETING_URL ??= "http://localhost:3000";
  process.env.NEXT_PUBLIC_ADMIN_URL ??= "http://localhost:3001";
  process.env.NEXT_PUBLIC_OPERATOR_URL ??= "http://localhost:3002";
  process.env.NEXT_PUBLIC_API_URL ??= process.env.NEXT_PUBLIC_OPERATOR_URL;
  process.env.NEXT_PUBLIC_SOCKET_URL ??= "http://localhost:3003";
  process.env.AUTH_COOKIE_SECURE ??= "false";
  process.env.SUPER_ADMIN_SECURITY_CODE ??= "CYBER-LINK-2026";

  if (portal === "marketing") {
    process.env.NEXT_PUBLIC_APP_URL ??= portalUrl;
  } else if (portal === "operator") {
    const authUrl = process.env.AUTH_OPERATOR_URL ?? portalUrl;
    process.env.AUTH_URL = authUrl;
    process.env.NEXTAUTH_URL = authUrl;
    process.env.NEXT_PUBLIC_APP_URL = portalUrl;
  } else {
    const authUrl = process.env.AUTH_ADMIN_URL ?? portalUrl;
    process.env.AUTH_URL = authUrl;
    process.env.NEXTAUTH_URL = authUrl;
    process.env.NEXT_PUBLIC_APP_URL = portalUrl;
  }

  return {
    NEXT_PUBLIC_PORTAL: portal,
    NEXT_PUBLIC_MARKETING_URL: process.env.NEXT_PUBLIC_MARKETING_URL,
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_OPERATOR_URL: process.env.NEXT_PUBLIC_OPERATOR_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  };
}
