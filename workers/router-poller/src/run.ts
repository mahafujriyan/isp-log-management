import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "@isp/core/lib/database";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";
import { syncPppoeActiveSessions } from "@isp/core/services/pppoe-session.service";
import { recordDeviceApiSync } from "@isp/core/services/device.service";
import { fetchRouterPppActive } from "./routeros-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../../..");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, ".env.production.local"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const ROUTER_POLL_INTERVAL = Number(process.env.ROUTER_POLL_INTERVAL ?? 15_000);
const ROUTER_POLL_SCHEMA = process.env.ROUTER_POLL_SCHEMA?.trim();

async function resolveRouterInfo(schemaName: string, routerIp: string): Promise<{ router_id: number | null; router_name: string }> {
  const schema = assertValidTenantSchema(schemaName);
  const row = await db.getOne<{ router_id: number; router_name: string }>(
    `SELECT id AS router_id, COALESCE(name, identity, host(router_ip), 'Router') AS router_name
     FROM "${schema}".routers
     WHERE host(router_ip) = $1
     LIMIT 1`,
    [routerIp]
  );
  return {
    router_id: row?.router_id ?? null,
    router_name: row?.router_name ?? "Router",
  };
}

interface PollTarget {
  schema_name: string;
  device_name: string;
  device_ip: string;
  api_user: string;
  api_password: string;
  api_port: number;
}

async function listTargetSchemas(): Promise<string[]> {
  if (ROUTER_POLL_SCHEMA) return [assertValidTenantSchema(ROUTER_POLL_SCHEMA)];
  const rows = await db.getMany<{ schema_name: string }>(
    `SELECT schema_name FROM public.tenants WHERE status = 'active' ORDER BY id`
  );
  return rows
    .map((r) => r.schema_name)
    .filter(Boolean)
    .map((s) => assertValidTenantSchema(s));
}

async function listTargetsForSchema(schemaName: string): Promise<PollTarget[]> {
  const schema = assertValidTenantSchema(schemaName);
  return await db.getMany<PollTarget>(
    `SELECT
       $1::text AS schema_name,
       d.name AS device_name,
       host(d.device_ip) AS device_ip,
       COALESCE(NULLIF(d.api_user, ''), 'admin') AS api_user,
       d.api_password AS api_password,
       COALESCE(d.api_port, 8728) AS api_port
     FROM "${schema}".devices d
     WHERE COALESCE(d.status, 'active') NOT IN ('disabled', 'offline')
       AND UPPER(d.config_type) IN ('ACCESS', 'BRAS')
       AND d.api_password IS NOT NULL
       AND d.api_password <> ''
       AND d.api_user IS NOT NULL
       AND d.api_user <> ''`,
    [schema]
  );
}

async function pollOnce(): Promise<void> {
  const started = Date.now();
  let totalTargets = 0;
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalDisconnected = 0;
  try {
    const schemas = await listTargetSchemas();
    for (const schema of schemas) {
      const targets = await listTargetsForSchema(schema);
      totalTargets += targets.length;
      for (const target of targets) {
        try {
          const sessions = await fetchRouterPppActive({
            host: target.device_ip,
            port: target.api_port,
            user: target.api_user,
            password: target.api_password,
            timeoutMs: 10_000,
          });
          totalFetched += sessions.length;
          const router = await resolveRouterInfo(schema, target.device_ip);
          const { upserted, disconnected } = await syncPppoeActiveSessions(
            schema,
            router.router_id,
            sessions.map((s) => ({
              ...s,
              router_id: router.router_id,
              router_name: target.device_name || router.router_name,
            }))
          );
          await recordDeviceApiSync(schema, target.device_ip, true);
          totalUpserted += upserted;
          totalDisconnected += disconnected;
          console.log(
            `[router-poller] ${schema}/${target.device_name}(${target.device_ip}:${target.api_port}) fetched=${sessions.length} upserted=${upserted} disconnected=${disconnected}`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await recordDeviceApiSync(schema, target.device_ip, false, message).catch(() => {});
          console.error(
            `[router-poller] ${schema}/${target.device_name}(${target.device_ip}) failed:`,
            message
          );
        }
      }
    }
    if (totalTargets === 0) {
      console.warn("[router-poller] no ACCESS/BRAS devices with api_user/api_password found in database");
    }
    console.log(
      `[router-poller] cycle done targets=${totalTargets} fetched=${totalFetched} upserted=${totalUpserted} disconnected=${totalDisconnected} in ${Date.now() - started}ms`
    );
  } catch (error) {
    console.error(
      "[router-poller] cycle failed:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

console.log(`[router-poller] start interval=${ROUTER_POLL_INTERVAL}ms schema=${ROUTER_POLL_SCHEMA ?? "all-active"}`);

void pollOnce();
const interval = setInterval(() => {
  void pollOnce();
}, Math.max(5_000, ROUTER_POLL_INTERVAL));

process.on("SIGINT", () => {
  clearInterval(interval);
  console.log("\n[router-poller] shutting down");
  process.exit(0);
});
