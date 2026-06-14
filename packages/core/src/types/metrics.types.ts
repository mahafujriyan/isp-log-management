export type ChartType = "line" | "bar" | "pie";
export type ChartSize = "small" | "medium" | "large";
export type MetricTimeRange = "1h" | "24h" | "7d" | "30d";

export interface MetricDefinition {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  unit: string;
  chart_type: ChartType;
  color: string;
  is_active: boolean;
  created_at?: string;
}

export interface TenantMetricSetting {
  id: number;
  tenant_id: number;
  metric_id: number;
  is_visible: boolean;
  position: number;
  chart_size: ChartSize;
  refresh_interval: number;
  created_at?: string;
}

export interface MetricChartPoint {
  name: string;
  value: number;
  recorded_at?: string;
}

export interface MetricWithData extends MetricDefinition {
  is_visible: boolean;
  position: number;
  chart_size: ChartSize;
  refresh_interval: number;
  data: MetricChartPoint[];
}

export interface AdminMetricRow extends MetricDefinition {
  is_visible: boolean;
  position: number;
  chart_size: ChartSize;
  refresh_interval: number;
}

export interface MikroTikLog {
  timestamp: Date;
  pppoeUser: string;
  userIp: string;
  natIp: string;
  visitedIp: string;
  bandwidth: number;
  protocol: string;
}

export interface ParsedMetrics {
  totalBandwidth: number;
  activeUsers: number;
  activeConnections: number;
  topIps: Array<{ ip: string; bandwidth: number }>;
  protocolDistribution: Record<string, number>;
}
