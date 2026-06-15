/**
 * Typed environment configuration — reads process.env lazily (monorepo-safe).
 */
export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
  get isDev() {
    return this.nodeEnv === "development";
  },
  get isProd() {
    return this.nodeEnv === "production";
  },

  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },

  get portals() {
    return {
      marketing: process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000",
      admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
      operator: process.env.NEXT_PUBLIC_OPERATOR_URL ?? "http://localhost:3002",
      api:
        process.env.NEXT_PUBLIC_API_URL ??
        process.env.NEXT_PUBLIC_OPERATOR_URL ??
        "http://localhost:3002",
    };
  },

  get database() {
    return { url: process.env.DATABASE_URL ?? "" };
  },

  get auth() {
    return {
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
      url: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      sessionMaxAge: 60 * 60 * 8,
      superAdminCode: process.env.SUPER_ADMIN_SECURITY_CODE ?? "CYBER-LINK-2026",
      cookieSecure:
        process.env.AUTH_COOKIE_SECURE === "true"
          ? true
          : process.env.AUTH_COOKIE_SECURE === "false"
            ? false
            : (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").startsWith("https://"),
    };
  },

  get btrc() {
    return {
      ispLicense: process.env.BTRC_ISP_LICENSE ?? "ISP-BD-XXXX-XXXX",
      ispName: process.env.BTRC_ISP_NAME ?? "Cyber Link Communication",
      apiUrl: process.env.BTRC_API_URL ?? "",
      apiKey: process.env.BTRC_API_KEY ?? "",
      autoSubmit: process.env.BTRC_AUTO_SUBMIT === "true",
      submitIntervalHours: Number(process.env.BTRC_SUBMIT_INTERVAL_HOURS ?? 24),
      retentionDays: Number(process.env.BTRC_RETENTION_DAYS ?? 180),
      contactEmail: process.env.BTRC_CONTACT_EMAIL ?? "admin@cyberlink.com",
    };
  },

  get cron() {
    return { secret: process.env.CRON_SECRET ?? "" };
  },

  get ingest() {
    return { secret: process.env.INGEST_SECRET ?? process.env.CRON_SECRET ?? "" };
  },

  get syslog() {
    return {
      udpPort: Number(process.env.SYSLOG_UDP_PORT ?? 514),
      socketPort: Number(process.env.SOCKET_PORT ?? 3003),
      logFile: process.env.SYSLOG_FILE ?? "/var/log/mikrotik/isp-syslog.log",
      defaultTenantSchema: process.env.DEFAULT_TENANT_SCHEMA ?? "tenant_001",
    };
  },

  get imgbb() {
    return { apiKey: process.env.IMGBB_API_KEY ?? "" };
  },
};

export function requireEnv(key: "authSecret" | "database"): string {
  if (key === "authSecret") {
    const v = env.auth.secret;
    if (!v) throw new Error("AUTH_SECRET is not configured");
    return v;
  }
  const v = env.database.url;
  if (!v) throw new Error("DATABASE_URL is not configured");
  return v;
}
