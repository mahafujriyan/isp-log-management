export interface DashboardMetrics {
  totalLogs: number;
  activeUsers: number;
  devices: number;
  diskUsedGb: number;
  diskTotalGb: number;
}

export type DashboardPageId =
  | "dashboard"
  | "stream"
  | "devices"
  | "search"
  | "disabled"
  | "usermgr"
  | "rolemgr"
  | "servermgr"
  | "menumgr"
  | "serviceinfo"
  | "company"
  | "btrc"
  | "faq";
