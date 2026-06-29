import type { ParsedMikroTikLog } from "@isp/core/lib/parser";

const MAX_SYSLOG_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * MikroTik syslog headers often lack year or use stale dates (e.g. "Jun  8").
 * Use ingest wall-clock when parsed time is missing, in the future, or too old.
 */
export function resolveLogTimestamp(parsed: Pick<ParsedMikroTikLog, "timestamp">): Date {
  const now = new Date();
  const ts = parsed.timestamp ?? now;
  const ageMs = now.getTime() - ts.getTime();
  if (ageMs < 0 || ageMs > MAX_SYSLOG_AGE_MS) return now;
  return ts;
}
