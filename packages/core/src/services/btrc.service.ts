import type { LogEntry } from "@isp/core/types/entities.types";
import type {
  BtrcComplianceStatus,
  BtrcConfig,
  BtrcNatRecord,
  BtrcSubmission,
} from "@isp/core/types/btrc.types";
import { BTRC_CONFIG, getDefaultBtrcConfig } from "@isp/core/config/btrc.config";
import { db } from "@isp/core/lib/database";
import { generateMockLogEntry } from "@isp/core/services/mock-data.service";
import { getLogsAcrossTenants } from "@isp/core/services/syslog.service";
import {
  generateBatchId,
  hashPayload,
  logEntryToBtrcRecord,
  recordsToCsv,
  recordsToJsonPayload,
  submitToBtrcApi,
} from "@isp/core/utils";

const memorySubmissions: BtrcSubmission[] = [];
let memoryConfig: BtrcConfig | null = null;

export async function loadBtrcConfig(): Promise<BtrcConfig> {
  try {
    const row = await db.getOne<BtrcConfig>(
      "SELECT * FROM public.btrc_config ORDER BY id DESC LIMIT 1"
    );
    if (row) {
      memoryConfig = row;
      return row;
    }
  } catch {
    // database unavailable
  }
  return memoryConfig ?? getDefaultBtrcConfig();
}

export async function saveBtrcConfig(config: BtrcConfig): Promise<BtrcConfig> {
  memoryConfig = config;
  try {
    const existing = await db.getOne<{ id: number }>(
      "SELECT id FROM public.btrc_config ORDER BY id DESC LIMIT 1"
    );

    if (existing) {
      await db.query(
        `UPDATE public.btrc_config SET
          isp_license = $1, isp_name = $2, api_url = $3,
          auto_submit = $4, submit_interval_hours = $5,
          retention_days = $6, timezone = $7, contact_email = $8,
          updated_at = NOW()
         WHERE id = $9`,
        [
          config.isp_license, config.isp_name, config.api_url,
          config.auto_submit, config.submit_interval_hours,
          config.retention_days, config.timezone, config.contact_email,
          existing.id,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO public.btrc_config
          (isp_license, isp_name, api_url, auto_submit, submit_interval_hours, retention_days, timezone, contact_email)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          config.isp_license, config.isp_name, config.api_url,
          config.auto_submit, config.submit_interval_hours,
          config.retention_days, config.timezone, config.contact_email,
        ]
      );
    }
    return loadBtrcConfig();
  } catch {
    return config;
  }
}

export async function fetchLogsForBtrc(
  from?: string,
  to?: string,
  limit = 500
): Promise<LogEntry[]> {
  try {
    const tenantLogs = await getLogsAcrossTenants({ from, to, limit });
    if (tenantLogs.length > 0) return tenantLogs;
  } catch {
    // fall through to legacy table
  }

  try {
    const params: unknown[] = [];
    let query = `SELECT log_time, pppoe_user, mac_address AS mac, private_ip::text AS user_ip,
                        public_ip::text AS nat_ip, public_port AS nat_port,
                        dest_ip::text AS visited_ip, dest_port AS port, protocol
                 FROM public.nat_logs WHERE 1=1`;

    if (from) {
      params.push(from);
      query += ` AND log_time >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND log_time <= $${params.length}`;
    }
    params.push(limit);
    query += ` ORDER BY log_time DESC LIMIT $${params.length}`;

    const rows = await db.getMany<{
      log_time: string;
      pppoe_user: string;
      mac: string;
      user_ip: string;
      nat_ip: string;
      nat_port: number;
      visited_ip: string;
      port: number;
      protocol: string;
    }>(query, params);

    if (rows.length > 0) {
      return rows.map((r) => ({
        time: new Date(r.log_time).toISOString(),
        pppoe_user: r.pppoe_user,
        mac: r.mac,
        user_ip: r.user_ip,
        nat_ip: r.nat_ip,
        nat_port: r.nat_port,
        visited_ip: r.visited_ip,
        port: r.port,
        protocol: r.protocol,
      }));
    }
  } catch {
    // fall through to mock
  }

  return Array.from({ length: Math.min(limit, 200) }, () => generateMockLogEntry());
}

export async function buildBtrcRecords(
  from?: string,
  to?: string,
  limit = 500
): Promise<BtrcNatRecord[]> {
  const config = await loadBtrcConfig();
  const logs = await fetchLogsForBtrc(from, to, limit);
  return logs.map((log) => logEntryToBtrcRecord(log, config));
}

export async function recordSubmission(
  submission: Omit<BtrcSubmission, "id">
): Promise<BtrcSubmission> {
  const entry: BtrcSubmission = { ...submission, id: memorySubmissions.length + 1 };
  memorySubmissions.unshift(entry);

  try {
    const row = await db.getOne<BtrcSubmission>(
      `INSERT INTO public.btrc_submissions
        (batch_id, record_count, period_from, period_to, status, response_code, response_message, file_hash, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        submission.batch_id, submission.record_count,
        submission.period_from, submission.period_to, submission.status,
        submission.response_code ?? null, submission.response_message ?? null,
        submission.file_hash ?? null, submission.submitted_by ?? null,
      ]
    );
    if (row) return row;

    if (submission.status === "success" || submission.status === "simulated") {
      await db.query("UPDATE public.btrc_config SET last_submission_at = NOW(), updated_at = NOW()");
    }
  } catch {
    // memory only
  }

  return entry;
}

export async function getSubmissionHistory(limit = 20): Promise<BtrcSubmission[]> {
  try {
    return await db.getMany<BtrcSubmission>(
      "SELECT * FROM public.btrc_submissions ORDER BY submitted_at DESC LIMIT $1",
      [limit]
    );
  } catch {
    return memorySubmissions.slice(0, limit);
  }
}

export async function getComplianceStatus(): Promise<BtrcComplianceStatus> {
  const config = await loadBtrcConfig();
  const submissions = await getSubmissionHistory(1);
  const last = submissions[0];

  let logsReady = 0;
  let logsPending = 0;
  try {
    const counts = await db.getOne<{ total: string; pending: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE NOT btrc_exported)::text AS pending
       FROM public.nat_logs
       WHERE log_time >= NOW() - ($1 || ' days')::interval`,
      [String(config.retention_days)]
    );
    logsReady = Number(counts?.total ?? 0);
    logsPending = Number(counts?.pending ?? 0);
  } catch {
    logsReady = 200;
    logsPending = 200;
  }

  const retentionOk = config.retention_days >= BTRC_CONFIG.minRetentionDays;
  let nextAutoSubmit: string | null = null;
  if (config.auto_submit && config.last_submission_at) {
    const next = new Date(config.last_submission_at);
    next.setHours(next.getHours() + config.submit_interval_hours);
    nextAutoSubmit = next.toISOString();
  }

  return {
    compliant: retentionOk && (last?.status === "success" || last?.status === "simulated"),
    retention_days: config.retention_days,
    retention_required: BTRC_CONFIG.minRetentionDays,
    logs_ready: logsReady,
    logs_pending_export: logsPending || logsReady,
    last_submission: last?.submitted_at ?? config.last_submission_at ?? null,
    last_submission_status: last?.status ?? null,
    next_auto_submit: nextAutoSubmit,
    auto_submit_enabled: config.auto_submit,
  };
}

export async function exportBtrcData(
  format: "csv" | "json",
  from?: string,
  to?: string,
  limit = 500
) {
  const records = await buildBtrcRecords(from, to, limit);
  if (format === "csv") {
    return { contentType: "text/csv", body: recordsToCsv(records), records };
  }
  return {
    contentType: "application/json",
    body: JSON.stringify(recordsToJsonPayload(records), null, 2),
    records,
  };
}

export async function submitBtrcBatch(
  from?: string,
  to?: string,
  limit = 500,
  submittedBy?: string
) {
  const config = await loadBtrcConfig();
  const records = await buildBtrcRecords(from, to, limit);
  const batchId = generateBatchId();
  const payloadStr = JSON.stringify(recordsToJsonPayload(records));
  const fileHash = await hashPayload(payloadStr);

  const periodFrom = from ?? new Date(Date.now() - 86400000).toISOString();
  const periodTo = to ?? new Date().toISOString();
  const result = await submitToBtrcApi(records, config, batchId);

  const submission = await recordSubmission({
    batch_id: batchId,
    record_count: records.length,
    period_from: periodFrom,
    period_to: periodTo,
    status: result.simulated ? "simulated" : result.success ? "success" : "failed",
    response_code: result.statusCode,
    response_message: result.message,
    file_hash: fileHash,
    submitted_at: new Date().toISOString(),
    submitted_by: submittedBy ?? "system",
  });

  return { result, submission, records };
}

export { recordsToCsv, recordsToJsonPayload };
