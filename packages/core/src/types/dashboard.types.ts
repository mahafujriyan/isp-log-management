export interface DashboardMetrics {
  totalLogs: number;
  activeUsers: number;
  devices: number;
  diskUsedGb: number;
  diskTotalGb: number;
  storageUsedMb?: number;
  storageLimitMb?: number;
  storageProvider?: string;
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
  | "analytics"
  | "faq";
