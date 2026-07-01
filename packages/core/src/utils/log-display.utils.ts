import type { LogEntry } from "@isp/core/types";

/** Normalize MAC to AA:BB:CC:DD:EE:FF for display. */
export function formatDisplayMac(mac?: string | null): string {
  if (!mac?.trim()) return "Unknown";
  const hex = mac.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 12) return mac.trim();
  return hex.match(/.{2}/g)!.join(":");
}

/** PPPoE username from real data only. */
export function formatDisplayUser(log: Pick<LogEntry, "pppoe_user" | "user_ip">): string {
  const user = log.pppoe_user?.trim();
  if (user) return user;
  return "Unknown";
}

export function formatLogTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function enrichLogEntryForDisplay(entry: LogEntry): LogEntry {
  return {
    ...entry,
    mac: formatDisplayMac(entry.mac),
    pppoe_user: entry.pppoe_user?.trim() ? entry.pppoe_user.trim() : "Unknown",
  };
}
