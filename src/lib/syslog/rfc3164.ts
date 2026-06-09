/**
 * RFC3164 syslog message parsing (MikroTik default format).
 * Example: <30>Jan  5 12:00:01 MikroTik-NAT firewall,info message...
 */

export interface Rfc3164Message {
  priority: number;
  facility: number;
  severity: number;
  timestamp: Date | null;
  hostname: string;
  tag: string;
  message: string;
  raw: string;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export function parsePriority(pri: number): { facility: number; severity: number } {
  return { facility: Math.floor(pri / 8), severity: pri % 8 };
}

export function parseRfc3164(raw: string): Rfc3164Message {
  const trimmed = raw.trim();
  const fallback: Rfc3164Message = {
    priority: 13,
    facility: 1,
    severity: 5,
    timestamp: null,
    hostname: "",
    tag: "",
    message: trimmed,
    raw: trimmed,
  };

  const priMatch = trimmed.match(/^<(\d{1,3})>/);
  let rest = trimmed;
  let priority = 13;

  if (priMatch) {
    priority = Number(priMatch[1]);
    rest = trimmed.slice(priMatch[0].length).trim();
  }

  const { facility, severity } = parsePriority(priority);

  // BSD timestamp: Mmm dd hh:mm:ss
  const tsMatch = rest.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+/);
  let timestamp: Date | null = null;
  let afterTs = rest;

  if (tsMatch) {
    const month = MONTHS[tsMatch[1]];
    if (month !== undefined) {
      const day = Number(tsMatch[2]);
      const hour = Number(tsMatch[3]);
      const min = Number(tsMatch[4]);
      const sec = Number(tsMatch[5]);
      const year = new Date().getFullYear();
      timestamp = new Date(year, month, day, hour, min, sec);
      if (timestamp.getTime() > Date.now() + 86400000) {
        timestamp.setFullYear(year - 1);
      }
    }
    afterTs = rest.slice(tsMatch[0].length);
  }

  const hostMatch = afterTs.match(/^(\S+)\s+/);
  let hostname = "";
  let payload = afterTs;

  if (hostMatch) {
    hostname = hostMatch[1];
    payload = afterTs.slice(hostMatch[0].length);
  }

  // MikroTik: "topic,level rest" e.g. firewall,info forward: ...
  const tagMatch = payload.match(/^([^,\s]+(?:,[^,\s]+)?)\s+([\s\S]*)$/);
  const tag = tagMatch ? tagMatch[1] : "";
  const message = tagMatch ? tagMatch[2] : payload;

  return {
    priority,
    facility,
    severity,
    timestamp,
    hostname,
    tag,
    message: message.trim(),
    raw: trimmed,
  };
}

export function extractSourceIp(hostname: string, message: string): string {
  const fromHost = hostname.match(/\d{1,3}(?:\.\d{1,3}){3}/);
  if (fromHost) return fromHost[0];

  const srcMatch = message.match(/\bsrc(?:-address)?[=:]?\s*(\d{1,3}(?:\.\d{1,3}){3})/i);
  if (srcMatch) return srcMatch[1];

  return hostname.replace(/[^0-9.]/g, "").match(/\d{1,3}(?:\.\d{1,3}){3}/)?.[0] ?? hostname;
}
