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
