import { createPgClient, getDatabaseUrl } from "../database/scripts/lib/db-client.mjs";

getDatabaseUrl();
const c = createPgClient();
await c.connect();

const tenants = await c.query(
  "SELECT id, schema_name, admin_email, status FROM public.tenants ORDER BY id"
);
console.log("tenants:", tenants.rows);

for (const t of tenants.rows) {
  const schema = t.schema_name;
  const session = await c.query(
    `SELECT COUNT(*)::int AS n, MAX(log_time) AS latest FROM "${schema}".session_logs`
  );
  const syslog = await c.query(
    `SELECT COUNT(*)::int AS n, MAX(received_at) AS latest FROM "${schema}".syslogs`
  );
  const sample = await c.query(
    `SELECT log_time, pppoe_user, host(nat_ip) AS nat_ip FROM "${schema}".session_logs ORDER BY log_time DESC LIMIT 2`
  );
  console.log(`\n${schema} (id=${t.id}):`);
  console.log("  session_logs:", session.rows[0]);
  console.log("  syslogs:", syslog.rows[0]);
  console.log("  sample:", sample.rows);
}

await c.end();
