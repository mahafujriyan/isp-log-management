import { db } from "@isp/core/lib/database";

export type SecurityEventType =
  | "login_failed"
  | "login_blocked"
  | "login_success"
  | "account_request_blocked"
  | "account_request"
  | "rate_limited"
  | "unauthorized_access";

export type SecuritySeverity = "critical" | "warning" | "info";

export interface SecurityEventInput {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  ip?: string | null;
  device_id?: string | null;
  email?: string | null;
  tenant_id?: number | null;
  message: string;
  metadata?: Record<string, unknown> | null;
}

export interface SecurityEvent extends SecurityEventInput {
  id: number;
  created_at: string;
}

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = db
      .query(
        `CREATE TABLE IF NOT EXISTS public.security_events (
          id BIGSERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'warning',
          ip TEXT,
          device_id TEXT,
          email TEXT,
          tenant_id INTEGER,
          message TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_security_events_created_at
          ON public.security_events (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_security_events_tenant
          ON public.security_events (tenant_id, created_at DESC);`
      )
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later call can retry if the DB was briefly unavailable.
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

/**
 * Persist a security event to the backend (never throws — security logging must
 * not break the request it is protecting).
 */
export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    await ensureTable();
    await db.query(
      `INSERT INTO public.security_events
        (event_type, severity, ip, device_id, email, tenant_id, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.event_type,
        input.severity,
        input.ip ?? null,
        input.device_id ?? null,
        input.email ?? null,
        input.tenant_id ?? null,
        input.message,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );
  } catch {
    // Best-effort — swallow so the caller flow continues.
  }
}

export interface GetAlertsOptions {
  tenantId?: number | null;
  isSuperAdmin?: boolean;
  sinceMinutes?: number;
  limit?: number;
  severities?: SecuritySeverity[];
}

/**
 * Recent security alerts. Super admins see everything; other roles see events
 * that are global (no tenant) or scoped to their own tenant.
 */
export async function getRecentSecurityAlerts(
  opts: GetAlertsOptions = {}
): Promise<SecurityEvent[]> {
  const { tenantId, isSuperAdmin = false, sinceMinutes = 1440, limit = 50 } = opts;
  const severities = opts.severities ?? ["critical", "warning"];

  try {
    await ensureTable();
    const params: unknown[] = [sinceMinutes, severities];
    let scopeClause = "";
    if (!isSuperAdmin) {
      params.push(tenantId ?? null);
      scopeClause = ` AND (tenant_id IS NULL OR tenant_id = $${params.length})`;
    }
    params.push(Math.min(Math.max(limit, 1), 200));

    const rows = await db.getMany<SecurityEvent>(
      `SELECT id, event_type, severity, ip, device_id, email, tenant_id, message, metadata, created_at
       FROM public.security_events
       WHERE created_at >= NOW() - ($1 || ' minutes')::interval
         AND severity = ANY($2)${scopeClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return rows;
  } catch {
    return [];
  }
}

export async function countRecentAlerts(opts: GetAlertsOptions = {}): Promise<number> {
  const alerts = await getRecentSecurityAlerts({ ...opts, limit: 200 });
  return alerts.length;
}
