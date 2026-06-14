import { BTRC_CONFIG } from "@isp/core/config/btrc.config";
import { env } from "@isp/core/config/env.config";
import type { LogEntry } from "@isp/core/types/entities.types";
import type {
  BtrcConfig,
  BtrcNatRecord,
  BtrcSubmitResult,
} from "@isp/core/types/btrc.types";
import { parseLogTime, toBtrcDatetime } from "@isp/core/utils/date.utils";
import { escapeCsvValue } from "@isp/core/utils/crypto.utils";

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
    protocol:
      entry.protocol ?? (entry.port === 443 ? "TCP" : entry.port === 53 ? "UDP" : "TCP"),
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
      .map(escapeCsvValue)
      .join(",")
  );
  return [BTRC_CONFIG.csvHeaders.join(","), ...rows].join("\n");
}

export function recordsToJsonPayload(records: BtrcNatRecord[]) {
  return {
    version: BTRC_CONFIG.payloadVersion,
    regulator: BTRC_CONFIG.regulator,
    country: BTRC_CONFIG.country,
    submitted_at: toBtrcDatetime(),
    record_count: records.length,
    records,
  };
}

export async function submitToBtrcApi(
  records: BtrcNatRecord[],
  config: BtrcConfig,
  batchId: string
): Promise<BtrcSubmitResult> {
  const payload = recordsToJsonPayload(records);
  const apiUrl = config.api_url || env.btrc.apiUrl;
  const apiKey = env.btrc.apiKey;

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
        Authorization: `Bearer ${apiKey}`,
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
