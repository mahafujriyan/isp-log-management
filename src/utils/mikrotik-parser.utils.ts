import type { LogEntry } from "@/types/entities.types";
import type { MikroTikLog, ParsedMetrics } from "@/types/metrics.types";

function extractValue(log: string, key: string): string {
  const match = log.match(new RegExp(`${key}=([^\\s,;]+)`, "i"));
  return match ? match[1] : "";
}

export function parseMikroTikLog(rawLog: string): MikroTikLog {
  return {
    timestamp: new Date(),
    pppoeUser: extractValue(rawLog, "pppoe_user") || extractValue(rawLog, "user"),
    userIp: extractValue(rawLog, "user_ip") || extractValue(rawLog, "src"),
    natIp: extractValue(rawLog, "nat_ip") || extractValue(rawLog, "public_ip"),
    visitedIp: extractValue(rawLog, "visited_ip") || extractValue(rawLog, "dst"),
    bandwidth: Number.parseInt(extractValue(rawLog, "bandwidth"), 10) || 0,
    protocol: extractValue(rawLog, "protocol") || "TCP",
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
