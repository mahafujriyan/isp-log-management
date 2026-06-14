export interface Plan {
  id: number;
  name: string;
  max_users: number;
  max_devices: number;
  retention_days: number;
  max_logs_per_day: number;
  price_bdt: number;
  is_featured?: boolean;
  created_at?: string;
}

export interface Tenant {
  id: number;
  admin_name: string;
  admin_email: string;
  schema_name: string;
  plan_id: number;
  plan_name?: string;
  status: string;
  activated_at: string;
  expires_at: string;
  created_at: string;
  is_demo_sandbox?: boolean;
}

export interface User {
  id: number;
  tenant_id: number | null;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  account_type?: string;
  demo_expires_at?: string | null;
  created_at: string;
}

export interface LogEntry {
  id?: number;
  time: string;
  pppoe_user: string;
  mac: string;
  user_ip: string;
  nat_ip: string;
  visited_ip: string;
  port: number;
  nat_port?: number;
  protocol?: string;
}

export interface Device {
  id: number;
  name: string;
  ip: string;
  config: "NAT" | "ACCESS";
  nat_ip: string;
  user: string;
  port: number;
  listen_port: number;
  status: "online" | "offline" | "receiving";
  users_today: number;
}

export interface SyslogEntry {
  id: number;
  received_at: string;
  pppoe_user: string | null;
  mac_address: string | null;
  user_ip: string | null;
  user_port: number | null;
  nat_ip: string | null;
  nat_port: number | null;
  visited_ip: string | null;
  visited_port: number | null;
  protocol: string | null;
  country_code: string | null;
  city: string | null;
  raw_message: string | null;
}

export interface CreateTenantInput {
  admin_name: string;
  admin_email: string;
  plan_id: number;
  expires_in_days?: number;
}

export interface CreateDeviceInput {
  name: string;
  device_ip: string;
  config_type?: "NAT" | "ACCESS";
  nat_ip?: string;
  syslog_user?: string;
  syslog_port?: number;
  listen_port?: number;
  api_user?: string;
  api_password?: string;
  api_port?: number;
}

export interface IngestLogsInput {
  tenant_id?: number;
  schema?: string;
  logs?: Array<
    Partial<LogEntry> & {
      raw_message?: string;
      mac_address?: string;
      user_port?: number;
      visited_port?: number;
    }
  >;
}
