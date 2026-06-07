export interface Plan {
  id: number;
  name: string;
  max_users: number;
  max_devices: number;
  retention_days: number;
  max_logs_per_day: number;
  price_bdt: number;
  created_at?: string;
}

export interface Tenant {
  id: number;
  admin_name: string;
  admin_email: string;
  schema_name: string;
  plan_id: number;
  status: string;
  activated_at: string;
  expires_at: string;
  created_at: string;
}

export interface User {
  id: number;
  tenant_id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
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
