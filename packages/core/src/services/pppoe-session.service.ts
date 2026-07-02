import { db } from "@isp/core/lib/database";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

export interface PppoeActiveSession {
  username: string;
  mac_address?: string;
  assigned_ip: string;
  uptime?: string;
  router_id?: number | null;
  router_name?: string;
}

function isIpLike(value?: string | null): boolean {
  if (!value?.trim()) return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value.trim());
}

async function ensurePppoeColumns(schemaName: string): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await db.query(`ALTER TABLE "${schema}".pppoe_users ADD COLUMN IF NOT EXISTS router_name VARCHAR(128)`);
  await db.query(`ALTER TABLE "${schema}".pppoe_users ADD COLUMN IF NOT EXISTS uptime VARCHAR(64)`);
  await db.query(
    `ALTER TABLE "${schema}".pppoe_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  );
  await db
    .query(`CREATE INDEX IF NOT EXISTS idx_pppoe_users_private_ip ON "${schema}".pppoe_users (last_private_ip)`)
    .catch(() => {});
}

export async function upsertPppoeActiveSessions(
  schemaName: string,
  sessions: PppoeActiveSession[]
): Promise<{ upserted: number }> {
  const schema = assertValidTenantSchema(schemaName);
  await ensurePppoeColumns(schema);

  let upserted = 0;
  for (const session of sessions) {
    const username = session.username.trim();
    const assignedIp = session.assigned_ip.trim();
    if (!username || !assignedIp) continue;

    const row = await db.getOne<{ id: number }>(
      `WITH target AS (
         SELECT id
         FROM "${schema}".pppoe_users
         WHERE username = $1 OR host(last_private_ip) = $2
         ORDER BY CASE WHEN username = $1 THEN 0 ELSE 1 END, last_seen_at DESC
         LIMIT 1
       ),
       updated AS (
         UPDATE "${schema}".pppoe_users p
         SET username = $1,
             mac_address = COALESCE(NULLIF($3, ''), p.mac_address),
             last_private_ip = $2::inet,
             router_id = COALESCE($4, p.router_id),
             router_name = COALESCE(NULLIF($5, ''), p.router_name),
             uptime = COALESCE(NULLIF($6, ''), p.uptime),
             last_seen_at = NOW(),
             updated_at = NOW(),
             status = 'active'
         WHERE p.id = (SELECT id FROM target)
         RETURNING p.id
       )
       INSERT INTO "${schema}".pppoe_users
         (username, mac_address, last_private_ip, router_id, router_name, uptime, session_count, first_seen_at, last_seen_at, updated_at, status)
       SELECT $1, NULLIF($3, ''), $2::inet, $4, NULLIF($5, ''), NULLIF($6, ''), 1, NOW(), NOW(), NOW(), 'active'
       WHERE NOT EXISTS (SELECT 1 FROM updated)
       ON CONFLICT (username) DO UPDATE SET
         mac_address = COALESCE(NULLIF(EXCLUDED.mac_address, ''), "${schema}".pppoe_users.mac_address),
         last_private_ip = COALESCE(EXCLUDED.last_private_ip, "${schema}".pppoe_users.last_private_ip),
         router_id = COALESCE(EXCLUDED.router_id, "${schema}".pppoe_users.router_id),
         router_name = COALESCE(EXCLUDED.router_name, "${schema}".pppoe_users.router_name),
         uptime = COALESCE(EXCLUDED.uptime, "${schema}".pppoe_users.uptime),
         last_seen_at = NOW(),
         updated_at = NOW(),
         status = 'active'
       RETURNING id`,
      [
        username,
        assignedIp,
        session.mac_address?.trim() ?? "",
        session.router_id ?? null,
        session.router_name?.trim() ?? "",
        session.uptime?.trim() ?? "",
      ]
    );
    if (row?.id) upserted += 1;
  }

  return { upserted };
}

/** Upsert active PPPoE rows and mark missing sessions as disconnected for this router. */
export async function syncPppoeActiveSessions(
  schemaName: string,
  routerId: number | null,
  sessions: PppoeActiveSession[]
): Promise<{ upserted: number; disconnected: number }> {
  const { upserted } = await upsertPppoeActiveSessions(schemaName, sessions);

  if (!routerId) return { upserted, disconnected: 0 };

  const schema = assertValidTenantSchema(schemaName);
  const activeIps = sessions.map((s) => s.assigned_ip.trim()).filter(Boolean);

  const result = await db.query(
    `UPDATE "${schema}".pppoe_users
     SET status = 'disconnected', updated_at = NOW()
     WHERE router_id = $1
       AND status = 'active'
       AND (
         cardinality($2::text[]) = 0
         OR NOT (host(last_private_ip) = ANY($2))
       )`,
    [routerId, activeIps]
  );

  return { upserted, disconnected: result.rowCount ?? 0 };
}

export interface PppoeSessionMatch {
  username: string;
  mac_address: string;
  router_name: string | null;
  status: string | null;
  last_seen_at: string | null;
}

/**
 * Lookup the latest PPPoE session for a private IP (NAT log enrichment).
 * Prefers an active session; falls back to the most recent session for the IP.
 */
export async function lookupPppoeByPrivateIp(
  schemaName: string,
  privateIp: string
): Promise<PppoeSessionMatch | null> {
  if (!privateIp?.trim()) return null;
  const schema = assertValidTenantSchema(schemaName);
  const row = await db.getOne<{
    username: string;
    mac_address: string | null;
    router_name: string | null;
    status: string | null;
    last_seen_at: string | null;
  }>(
    `SELECT username, mac_address, router_name, status, last_seen_at::text AS last_seen_at
     FROM "${schema}".pppoe_users
     WHERE host(last_private_ip) = $1
     ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, last_seen_at DESC
     LIMIT 1`,
    [privateIp.trim()]
  );
  if (!row?.username || isIpLike(row.username)) return null;
  return {
    username: row.username,
    mac_address: row.mac_address?.trim() ?? "",
    router_name: row.router_name ?? null,
    status: row.status ?? null,
    last_seen_at: row.last_seen_at ?? null,
  };
}

/** Batch variant — returns a private-IP → session map for a set of IPs. */
export async function lookupPppoeByPrivateIps(
  schemaName: string,
  privateIps: string[]
): Promise<Map<string, PppoeSessionMatch>> {
  const result = new Map<string, PppoeSessionMatch>();
  const ips = Array.from(new Set(privateIps.filter((ip) => ip?.trim())));
  if (ips.length === 0) return result;

  const schema = assertValidTenantSchema(schemaName);
  const rows = await db.getMany<{
    ip: string;
    username: string;
    mac_address: string | null;
    router_name: string | null;
    status: string | null;
    last_seen_at: string | null;
  }>(
    `SELECT host(last_private_ip) AS ip, username, mac_address, router_name,
            status, last_seen_at::text AS last_seen_at
     FROM "${schema}".pppoe_users
     WHERE host(last_private_ip) = ANY($1::text[])
     ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, last_seen_at DESC`,
    [ips]
  );

  for (const row of rows) {
    if (!row.ip || result.has(row.ip)) continue;
    if (!row.username || isIpLike(row.username)) continue;
    result.set(row.ip, {
      username: row.username,
      mac_address: row.mac_address?.trim() ?? "",
      router_name: row.router_name ?? null,
      status: row.status ?? null,
      last_seen_at: row.last_seen_at ?? null,
    });
  }
  return result;
}
