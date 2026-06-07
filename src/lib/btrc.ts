import type { LogEntry } from "@/lib/types";

/** BTRC-compliant NAT log record (Bangladesh ISP standard fields) */
export interface BtrcNatRecord {
  isp_license_number: string;
  isp_name: string;
  log_datetime: string;
  subscriber_username: string;
  subscriber_mac: string;
  private_ip: string;
  public_ip: string;
  public_port: number;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  session_id: string;
}

export interface BtrcConfig {
  id?: number;
  isp_license: string;
  isp_name: string;
  api_url: string;
  auto_submit: boolean;
  submit_interval_hours: number;
  retention_days: number;
  timezone: string;
  contact_email: string;
  last_submission_at?: string | null;
}

export interface BtrcSubmission {
  id: number;
  batch_id: string;
  record_count: number;
  period_from: string;
  period_to: string;
  status: "pending" | "success" | "failed" | "simulated";
  response_code?: number | null;
  response_message?: string | null;
  file_hash?: string | null;
  submitted_at: string;
  submitted_by?: string | null;
}

export interface BtrcComplianceStatus {
  compliant: boolean;
  retention_days: number;
  retention_required: number;
  logs_ready: number;
  logs_pending_export: number;
  last_submission: string | null;
  last_submission_status: string | null;
  next_auto_submit: string | null;
  auto_submit_enabled: boolean;
}

export const BTRC_CSV_HEADERS = [
  "ISP_LICENSE",
  "ISP_NAME",
  "LOG_DATETIME",
  "SUBSCRIBER_ID",
  "MAC_ADDRESS",
  "PRIVATE_IP",
  "PUBLIC_IP",
  "PUBLIC_PORT",
  "DEST_IP",
  "DEST_PORT",
  "PROTOCOL",
  "SESSION_ID",
] as const;

export const BTRC_MIN_RETENTION_DAYS = 180;

export function getDefaultBtrcConfig(): BtrcConfig {
  return {
    isp_license: process.env.BTRC_ISP_LICENSE ?? "ISP-BD-XXXX-XXXX",
    isp_name: process.env.BTRC_ISP_NAME ?? "Cyber Link Communication",
    api_url: process.env.BTRC_API_URL ?? "",
    auto_submit: process.env.BTRC_AUTO_SUBMIT === "true",
    submit_interval_hours: Number(process.env.BTRC_SUBMIT_INTERVAL_HOURS ?? 24),
    retention_days: Number(process.env.BTRC_RETENTION_DAYS ?? 180),
    timezone: "Asia/Dhaka",
    contact_email: process.env.BTRC_CONTACT_EMAIL ?? "admin@cyberlink.com",
  };
}

export function toBtrcDatetime(date: Date = new Date()): string {
  return date.toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).replace(" ", "T") + "+06:00";
}

export function parseLogTime(timeStr: string): Date {
  const today = new Date();
  const match = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return today;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const ampm = match[4]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  today.setHours(h, m, s, 0);
  return today;
}

export function logEntryToBtrcRecord(
  entry: LogEntry,
  config: Pick<BtrcConfig, "isp_license" | "isp_name">
): BtrcNatRecord {
  const logDate = entry.time.includes("T")
    ? new Date(entry.time)
    : parseLogTime(entry.time);

  const sessionSeed = `${entry.pppoe_user}-${entry.user_ip}-${entry.nat_port}-${logDate.getTime()}`;

  return {
    isp_license_number: config.isp_license,
    isp_name: config.isp_name,
    log_datetime: toBtrcDatetime(logDate),
    subscriber_username: entry.pppoe_user,
    subscriber_mac: entry.mac.toUpperCase(),
    private_ip: entry.user_ip,
    public_ip: entry.nat_ip,
    public_port: entry.nat_port ?? 0,
    destination_ip: entry.visited_ip,
    destination_port: entry.port,
    protocol: entry.protocol ?? (entry.port === 443 ? "TCP" : entry.port === 53 ? "UDP" : "TCP"),
    session_id: Buffer.from(sessionSeed).toString("base64url").slice(0, 24),
  };
}

export function recordsToCsv(records: BtrcNatRecord[]): string {
  const rows = records.map((r) =>
    [
      r.isp_license_number,
      r.isp_name,
      r.log_datetime,
      r.subscriber_username,
      r.subscriber_mac,
      r.private_ip,
      r.public_ip,
      r.public_port,
      r.destination_ip,
      r.destination_port,
      r.protocol,
      r.session_id,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [BTRC_CSV_HEADERS.join(","), ...rows].join("\n");
}

export function recordsToJsonPayload(records: BtrcNatRecord[]) {
  return {
    version: "1.0",
    regulator: "BTRC",
    country: "BD",
    submitted_at: toBtrcDatetime(),
    record_count: records.length,
    records,
  };
}

export async function hashPayload(data: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(data).digest("hex");
}

export function generateBatchId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BTRC-${ts}-${rand}`;
}

export interface BtrcSubmitResult {
  success: boolean;
  simulated: boolean;
  statusCode: number;
  message: string;
  batchId: string;
  recordCount: number;
}

export async function submitToBtrcApi(
  records: BtrcNatRecord[],
  config: BtrcConfig,
  batchId: string
): Promise<BtrcSubmitResult> {
  const payload = recordsToJsonPayload(records);
  const apiUrl = config.api_url || process.env.BTRC_API_URL;
  const apiKey = process.env.BTRC_API_KEY;

  if (!apiUrl) {
    return {
      success: true,
      simulated: true,
      statusCode: 200,
      message: "Simulated submission (BTRC_API_URL not configured). Data validated and ready.",
      batchId,
      recordCount: records.length,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey ?? ""}`,
        "X-ISP-License": config.isp_license,
        "X-Batch-ID": batchId,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message ?? json.status ?? text;
    } catch {
      // keep raw text
    }

    return {
      success: response.ok,
      simulated: false,
      statusCode: response.status,
      message: response.ok ? "Successfully submitted to BTRC portal" : message,
      batchId,
      recordCount: records.length,
    };
  } catch (error) {
    return {
      success: false,
      simulated: false,
      statusCode: 0,
      message: error instanceof Error ? error.message : "Network error contacting BTRC API",
      batchId,
      recordCount: records.length,
    };
  }
}
