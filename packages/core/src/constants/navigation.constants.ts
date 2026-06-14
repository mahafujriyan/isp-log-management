import type { DashboardPageId } from "@isp/core/types/dashboard.types";

export const PAGE_TITLES: Record<DashboardPageId, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Real-time system overview" },
  stream: { title: "Log Stream", sub: "Live NAT/PPPoE log entries" },
  devices: { title: "Devices", sub: "Connected syslog sources" },
  search: { title: "Search Log", sub: "Query historical logs" },
  disabled: { title: "Disabled Devices", sub: "Devices not sending logs" },
  usermgr: { title: "User Manager", sub: "Manage admin panel users" },
  rolemgr: { title: "Role Manager", sub: "Role-based access control" },
  servermgr: { title: "Server Manager", sub: "Add & configure log sources" },
  menumgr: { title: "Menu Manager", sub: "Customize sidebar navigation" },
  serviceinfo: { title: "Service Info", sub: "Service health & system stats" },
  btrc: { title: "BTRC Compliance", sub: "Export & submit NAT logs to BTRC" },
  analytics: { title: "Analytics", sub: "MikroTik metrics — dynamic charts per configuration" },
  company: { title: "Company Settings", sub: "Organization configuration" },
  faq: { title: "FAQ", sub: "Help & documentation" },
};
