export const PORTAL_ROUTES = {
  marketing: "/",
  operator: {
    home: "/operator",
    logs: "/operator/logs",
    users: "/operator/users",
    reports: "/operator/reports",
    login: "/auth/login",
    legacyDashboard: "/dashboard",
  },
  admin: {
    home: "/admin",
    login: "/admin/login",
    tenants: "/admin/tenants",
    metrics: "/admin/metrics",
    billing: "/admin/billing",
    settings: "/admin/settings",
    demoRequests: "/admin/demo-requests",
    legacyLogin: "/auth/super-admin",
  },
} as const;

export const ADMIN_NAV = [
  { href: PORTAL_ROUTES.admin.home, label: "Dashboard", icon: "layout-dashboard" },
  { href: PORTAL_ROUTES.admin.tenants, label: "Tenants", icon: "users" },
  { href: PORTAL_ROUTES.admin.metrics, label: "Metrics Config", icon: "bar-chart-3" },
  { href: PORTAL_ROUTES.admin.billing, label: "Billing", icon: "credit-card" },
  { href: PORTAL_ROUTES.admin.demoRequests, label: "Demo Requests", icon: "inbox" },
  { href: PORTAL_ROUTES.admin.settings, label: "Settings", icon: "settings" },
] as const;

export const OPERATOR_NAV = [
  { href: PORTAL_ROUTES.operator.home, label: "Dashboard", icon: "layout-dashboard" },
  { href: PORTAL_ROUTES.operator.logs, label: "Logs", icon: "activity" },
  { href: PORTAL_ROUTES.operator.users, label: "Users", icon: "users" },
  { href: PORTAL_ROUTES.operator.reports, label: "Reports", icon: "file-bar-chart" },
  { href: PORTAL_ROUTES.operator.legacyDashboard, label: "Full Console", icon: "panel-left" },
] as const;

/** Demo accounts: sandbox logs only — no production console */
export const DEMO_OPERATOR_NAV = [
  { href: PORTAL_ROUTES.operator.home, label: "Dashboard", icon: "layout-dashboard" },
  { href: PORTAL_ROUTES.operator.logs, label: "Logs", icon: "activity" },
] as const;
