import { parseMikroTikSyslog } from "@isp/core/lib/parser";
import type { LogEntry } from "@isp/core/types/entities.types";
import type { MikroTikLog, ParsedMetrics } from "@isp/core/types/metrics.types";

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
