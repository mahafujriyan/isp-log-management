/**
 * MikroTik RouterOS syslog parser — firewall, NAT, PPPoE, PPP, key=value scripts.
 */

import { parseRfc3164, extractSourceIp } from "@/lib/syslog/rfc3164";

export interface ParsedMikroTikLog {
  timestamp: Date;
  pppoe_user: string;
  mac_address: string;
  user_ip: string;
  user_port: number | null;
  nat_ip: string;
  nat_port: number | null;
  visited_ip: string;
  visited_port: number | null;
  protocol: string;
  log_topic: string;
  router_hostname: string;
  source_ip: string;
  raw_message: string;
}

function pick(log: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = log.match(re);
    if (m?.[1]) return m[1];
  }
  return "";
}

function pickInt(log: string, patterns: RegExp[]): number | null {
  const v = pick(log, patterns);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizeMac(mac: string): string {
  const hex = mac.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 12) return mac;
  return hex.match(/.{2}/g)!.join(":");
}

function normalizeProtocol(proto: string): string {
  const p = proto.toLowerCase();
  if (p === "6" || p === "tcp") return "TCP";
  if (p === "17" || p === "udp") return "UDP";
  if (p === "1" || p === "icmp") return "ICMP";
  return proto.toUpperCase() || "TCP";
}

/** Parse raw syslog line (RFC3164 wrapper + MikroTik payload). */
export function parseMikroTikSyslog(raw: string): ParsedMikroTikLog {
  const syslog = parseRfc3164(raw);
  const payload = syslog.message || raw;
  const full = `${syslog.tag} ${payload}`.trim();

  const pppoeUser = pick(full, [
    /pppoe_user[=:]([^\s,;]+)/i,
    /user[=:]([^\s,;]+)/i,
    /\<([^\s<>@]+@[^\s<>]+)\>/,
    /pppoe,ppp,info\s+([^:\s]+):/i,
    /logged in, user\s+([^\s,]+)/i,
    /authenticated.*user[=\s]+([^\s,]+)/i,
  ]);

  const mac = normalizeMac(
    pick(full, [
      /mac[_-]?address[=:]([^\s,;]+)/i,
      /src-mac[=:]([^\s,;]+)/i,
      /caller-id[=:]([^\s,;]+)/i,
      /mac[=:]([^\s,;]+)/i,
    ])
  );

  const userIp = pick(full, [
    /user_ip[=:]([^\s,;]+)/i,
    /private[_-]?ip[=:]([^\s,;]+)/i,
    /src-address[=:]([^\s,;]+)/i,
    /\bsrc[=:](\d{1,3}(?:\.\d{1,3}){3})/i,
    /from\s+(\d{1,3}(?:\.\d{1,3}){3})/i,
  ]);

  const natIp = pick(full, [
    /nat[_-]?ip[=:]([^\s,;]+)/i,
    /public[_-]?ip[=:]([^\s,;]+)/i,
    /to-address[=:]([^\s,;]+)/i,
    /nat:\s*(\d{1,3}(?:\.\d{1,3}){3})/i,
  ]);

  const visitedIp = pick(full, [
    /visited[_-]?ip[=:]([^\s,;]+)/i,
    /dest[_-]?ip[=:]([^\s,;]+)/i,
    /dst-address[=:]([^\s,;]+)/i,
    /\bdst[=:](\d{1,3}(?:\.\d{1,3}){3})/i,
    /->\s*(\d{1,3}(?:\.\d{1,3}){3})/,
  ]);

  const userPort = pickInt(full, [
    /user[_-]?port[=:](\d+)/i,
    /src-port[=:](\d+)/i,
    /sport[=:](\d+)/i,
    /\bsrc[=:]\d{1,3}(?:\.\d{1,3}){3}:(\d+)/i,
  ]);

  const natPort = pickInt(full, [
    /nat[_-]?port[=:](\d+)/i,
    /public[_-]?port[=:](\d+)/i,
    /to-port[=:](\d+)/i,
  ]);

  const visitedPort = pickInt(full, [
    /visited[_-]?port[=:](\d+)/i,
    /dest[_-]?port[=:](\d+)/i,
    /dst-port[=:](\d+)/i,
    /dport[=:](\d+)/i,
    /\bdst[=:]\d{1,3}(?:\.\d{1,3}){3}:(\d+)/i,
  ]);

  const protocol = normalizeProtocol(
    pick(full, [/protocol[=:]([^\s,;]+)/i, /\bproto[=:]([^\s,;]+)/i, /\b(tcp|udp|icmp)\b/i])
  );

  const sourceIp = extractSourceIp(syslog.hostname, full);

  return {
    timestamp: syslog.timestamp ?? new Date(),
    pppoe_user: pppoeUser,
    mac_address: mac,
    user_ip: userIp,
    user_port: userPort,
    nat_ip: natIp,
    nat_port: natPort,
    visited_ip: visitedIp,
    visited_port: visitedPort,
    protocol,
    log_topic: syslog.tag || "unknown",
    router_hostname: syslog.hostname,
    source_ip: sourceIp,
    raw_message: raw.trim(),
  };
}

export function isNatOrFirewallLog(parsed: ParsedMikroTikLog): boolean {
  const topic = parsed.log_topic.toLowerCase();
  const msg = parsed.raw_message.toLowerCase();
  return (
    topic.includes("firewall") ||
    topic.includes("nat") ||
    topic.includes("forward") ||
    msg.includes("src-address") ||
    msg.includes("dst-address") ||
    Boolean(parsed.visited_ip && parsed.user_ip)
  );
}

export function isPppoeSessionLog(parsed: ParsedMikroTikLog): boolean {
  const topic = parsed.log_topic.toLowerCase();
  return topic.includes("ppp") || topic.includes("pppoe") || Boolean(parsed.pppoe_user);
}
