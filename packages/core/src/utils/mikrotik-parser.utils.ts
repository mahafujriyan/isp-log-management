import { parseMikroTikSyslog } from "@isp/core/lib/parser";
import type { LogEntry } from "@isp/core/types/entities.types";
import type { MikroTikLog, ParsedMetrics } from "@isp/core/types/metrics.types";

export function formatIspLogLine(
  entry: Partial<LogEntry> & {
    mac_address?: string;
    user_port?: number | null;
    visited_port?: number | null;
    raw_message?: string;
  }
): string {
  if (entry.raw_message?.includes("pppoe_user=")) {
    const kv = entry.raw_message.match(/pppoe_user=[^\n]+/)?.[0];
    if (kv) return kv;
  }

  const parts: string[] = [];
  if (entry.pppoe_user) parts.push(`pppoe_user=${entry.pppoe_user}`);
  const mac = entry.mac ?? entry.mac_address;
  if (mac) parts.push(`mac_address=${mac}`);
  if (entry.user_ip) parts.push(`user_ip=${entry.user_ip}`);
  if (entry.user_port != null) parts.push(`user_port=${entry.user_port}`);
  if (entry.nat_ip) parts.push(`nat_ip=${entry.nat_ip}`);
  if (entry.nat_port != null) parts.push(`nat_port=${entry.nat_port}`);
  if (entry.user_ip && entry.user_port != null) {
    parts.push(`src-address=${entry.user_ip}:${entry.user_port}`);
  }
  if (entry.visited_ip) parts.push(`visited_ip=${entry.visited_ip}`);
  const destPort = entry.port ?? entry.visited_port;
  if (destPort != null) parts.push(`visited_port=${destPort}`);
  if (entry.visited_ip && destPort != null) {
    parts.push(`dst-address=${entry.visited_ip}:${destPort}`);
  }
  if (entry.protocol) parts.push(`protocol=${entry.protocol.toLowerCase()}`);
  return parts.join(" ");
}

export function parseMikroTikLog(rawLog: string): MikroTikLog {
  const parsed = parseMikroTikSyslog(rawLog);
  return {
    timestamp: parsed.timestamp,
    pppoeUser: parsed.pppoe_user,
    userIp: parsed.user_ip,
    natIp: parsed.nat_ip,
    visitedIp: parsed.visited_ip,
    bandwidth: (parsed.user_port ?? 0) * 100 + (parsed.visited_port ?? 0),
    protocol: parsed.protocol,
  };
}

export function logEntryToMikroTikLog(entry: LogEntry & { raw_message?: string }): MikroTikLog {
  if (entry.raw_message) {
    const parsed = parseMikroTikLog(entry.raw_message);
    if (parsed.pppoeUser || parsed.userIp) return parsed;
  }

  const bandwidthGuess =
    (entry.port ?? 0) * 1000 + (entry.nat_port ?? 0);

  return {
    timestamp: entry.time ? new Date(entry.time) : new Date(),
    pppoeUser: entry.pppoe_user,
    userIp: entry.user_ip,
    natIp: entry.nat_ip,
    visitedIp: entry.visited_ip,
    bandwidth: bandwidthGuess,
    protocol: entry.protocol ?? (entry.port === 443 ? "HTTPS" : entry.port === 53 ? "UDP" : "TCP"),
  };
}

export function aggregateMetrics(logs: MikroTikLog[]): ParsedMetrics {
  const ipMap = new Map<string, number>();
  logs.forEach((log) => {
    if (!log.visitedIp) return;
    ipMap.set(log.visitedIp, (ipMap.get(log.visitedIp) ?? 0) + log.bandwidth);
  });

  const protocolDistribution = logs.reduce<Record<string, number>>((acc, log) => {
    const key = log.protocol || "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalBandwidth: logs.reduce((sum, log) => sum + log.bandwidth, 0),
    activeUsers: new Set(logs.map((l) => l.pppoeUser).filter(Boolean)).size,
    activeConnections: logs.length,
    topIps: [...ipMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, bandwidth]) => ({ ip, bandwidth })),
    protocolDistribution,
  };
}
