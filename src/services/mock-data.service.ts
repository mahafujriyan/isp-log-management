import type { LogEntry } from "@/types/entities.types";
import type { DashboardMetrics } from "@/types/dashboard.types";
import { nowStr } from "@/utils/date.utils";

const USERS = [
  "clc05@sohel3", "01baharuddin", "shohid", "07riaz", "23bayejid",
  "admin@link", "talha_isp", "bd_net99", "net_007", "cyberuser1",
];

const MACS = [
  "CC:2D:21:3F:BC:D0", "50:3D:D1:B2:74:B6", "D8:32:14:9C:13:B0",
  "D8:32:14:30:EE:98", "10:5A:95:7A:57:EC", "A4:C3:F0:12:56:78",
];

const NATS = [
  "160.187.175.136", "160.187.175.137", "160.187.175.138",
  "160.187.175.139", "160.187.175.143",
];

const VISITED = [
  "154.85.74.168", "107.151.196.188", "23.223.245.177", "23.55.235.12",
  "142.250.185.46", "172.217.3.110", "104.21.45.12", "31.13.72.36",
];

const PORTS = [443, 443, 443, 80, 8080, 9998, 9998, 53, 443, 8443];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)];

export function generateMockLogEntry(): LogEntry {
  const port = pick(PORTS);
  return {
    time: nowStr(),
    pppoe_user: pick(USERS),
    mac: pick(MACS),
    user_ip: `10.${rand(50, 70)}.${rand(0, 255)}.${rand(1, 254)}`,
    nat_ip: pick(NATS),
    visited_ip: pick(VISITED),
    port,
    nat_port: rand(30000, 65535),
    protocol: port === 443 ? "HTTPS" : port === 53 ? "DNS" : port === 80 ? "HTTP" : String(port),
  };
}

export function getDashboardMetrics(): DashboardMetrics {
  return {
    totalLogs: rand(1200, 4800),
    activeUsers: rand(45, 120),
    devices: 2,
    diskUsedGb: 1264,
    diskTotalGb: 1931,
  };
}

export function getHourlyLogCounts(): number[] {
  const hour = new Date().getHours();
  return Array.from({ length: 24 }, (_, i) =>
    i <= hour ? rand(80, 420) : rand(0, 30)
  );
}

export function getPortDistribution() {
  return {
    https: rand(800, 2000),
    http: rand(200, 600),
    p8080: rand(50, 200),
    p9998: rand(30, 150),
    dns: rand(100, 400),
    other: rand(50, 200),
  };
}

export const DEMO_DEVICES = [
  {
    id: 1, name: "Exabye_Core", ip: "160.187.175.9", config: "NAT" as const,
    nat_ip: "160.187.175.9", user: "log", port: 999, listen_port: 514,
    status: "receiving" as const, users_today: 87,
  },
  {
    id: 2, name: "CyberHome-DIS", ip: "160.187.175.46", config: "ACCESS" as const,
    nat_ip: "160.187.175.9", user: "log", port: 5111, listen_port: 514,
    status: "receiving" as const, users_today: 52,
  },
];

export const DEMO_ADMIN_USERS = [
  { id: 1, username: "admin", email: "admin@cyberlink.com", role: "Super Admin", last_login: "Today 03:47 PM", status: "Active" },
  { id: 2, username: "operator1", email: "ops@cyberlink.com", role: "Operator", last_login: "Today 10:22 AM", status: "Active" },
  { id: 3, username: "viewer_bd", email: "view@cyberlink.com", role: "Viewer", last_login: "Yesterday", status: "Inactive" },
];
