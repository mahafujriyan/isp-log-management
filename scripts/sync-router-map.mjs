#!/usr/bin/env node
/** Register all devices → routers + router_tenant_map (fixes MikroTik → wrong tenant). */
import { createPgClient } from "./lib/db-utils.mjs";

const client = createPgClient();

try {
  await client.connect();
  const { rows: tenants } = await client.query(
    `SELECT id, schema_name FROM public.tenants ORDER BY id`
  );

  let synced = 0;
  for (const tenant of tenants) {
    const schema = tenant.schema_name;
    let devices = [];
    try {
      const result = await client.query(
        `SELECT name, host(device_ip) AS device_ip, host(nat_ip) AS nat_ip, syslog_port
         FROM "${schema}".devices`
      );
      devices = result.rows;
    } catch {
      continue;
    }

    for (const d of devices) {
      const ip = d.device_ip || d.nat_ip;
      if (!ip) continue;

      await client.query(
        `INSERT INTO "${schema}".routers (name, router_ip, nat_ip, syslog_port, last_seen_at, status)
         VALUES ($1, $2::inet, $3::inet, $4, NOW(), 'active')
         ON CONFLICT (router_ip) DO UPDATE SET
           name = EXCLUDED.name,
           nat_ip = COALESCE(EXCLUDED.nat_ip, "${schema}".routers.nat_ip),
           last_seen_at = NOW()`,
        [d.name, ip, d.nat_ip ?? ip, d.syslog_port ?? 514]
      );

      const routerResult = await client.query(
        `SELECT id FROM "${schema}".routers WHERE host(router_ip) = $1 LIMIT 1`,
        [ip]
      );
      const router = routerResult.rows[0];
      if (!router) continue;

      await client.query(
        `INSERT INTO public.router_tenant_map (tenant_id, schema_name, router_ip, router_id, nat_ip, updated_at)
         VALUES ($1, $2, $3::inet, $4, $5::inet, NOW())
         ON CONFLICT (router_ip) DO UPDATE SET
           tenant_id = EXCLUDED.tenant_id,
           schema_name = EXCLUDED.schema_name,
           router_id = EXCLUDED.router_id,
           nat_ip = COALESCE(EXCLUDED.nat_ip, public.router_tenant_map.nat_ip),
           updated_at = NOW()`,
        [tenant.id, schema, ip, router.id, d.nat_ip ?? ip]
      );
      synced += 1;
    }
  }
  console.log(`✓ Synced ${synced} device(s) to router_tenant_map`);
} catch (err) {
  console.error("✗ Router sync failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
