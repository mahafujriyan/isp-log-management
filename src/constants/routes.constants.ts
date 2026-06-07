export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  admin: "/admin",
  auth: {
    login: "/auth/login",
    superAdmin: "/auth/super-admin",
  },
  api: {
    health: "/api/health",
    tenants: "/api/tenants",
    logs: "/api/logs",
    devices: "/api/devices",
    plans: "/api/plans",
    users: "/api/users",
    metrics: "/api/dashboard/metrics",
    btrc: {
      config: "/api/btrc/config",
      export: "/api/btrc/export",
      submit: "/api/btrc/submit",
      status: "/api/btrc/status",
      cron: "/api/btrc/cron",
    },
  },
} as const;

export const PROTECTED_ROUTES = ["/dashboard", "/admin"] as const;
export const AUTH_ROUTES = ["/auth/login", "/auth/super-admin"] as const;
