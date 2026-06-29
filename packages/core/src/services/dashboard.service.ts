import { db } from "@isp/core/lib/database";
import type { DashboardMetrics } from "@isp/core/types";
import { getDatabaseStorageMetrics } from "@isp/core/services/database-storage.service";
import { getActiveTenantSchemas, getTenantById } from "@isp/core/services/tenant.service";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

async function metricsForSchema(schema: string): Promise<{
  logsToday: number;
  activeUsers: number;
  devices: number;
}> {
  const schemaSafe = assertValidTenantSchema(schema);

  const logsRow = await db.getOne<{ count: string; users: string }>(
    `SELECT COUNT(*)::text AS count,
            COUNT(DISTINCT pppoe_user)::text AS users
     FROM (
       SELECT pppoe_user FROM "${schemaSafe}".session_logs
       WHERE log_time >= CURRENT_DATE
       UNION ALL
       SELECT pppoe_user FROM "${schemaSafe}".syslogs
       WHERE received_at >= CURRENT_DATE
     ) recent`
  ).catch(async () =>
    db.getOne<{ count: string; users: string }>(
      `SELECT COUNT(*)::text AS count,
              COUNT(DISTINCT pppoe_user)::text AS users
       FROM "${schemaSafe}".syslogs
       WHERE received_at >= CURRENT_DATE`
    )
  );

  const devicesRow = await db.getOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "${schemaSafe}".devices WHERE status = 'active'`
  );

  return {
    logsToday: Number(logsRow?.count ?? 0),
    activeUsers: Number(logsRow?.users ?? 0),
    devices: Number(devicesRow?.count ?? 0),
  };
}

export async function getLiveDashboardMetrics(
  tenantId?: number
): Promise<DashboardMetrics & { source: "database" }> {
  try {
    const storage = await getDatabaseStorageMetrics().catch(() => null);

    if (tenantId) {
      const tenant = await getTenantById(tenantId);
      if (!tenant) throw new Error("Tenant not found");
      const m = await metricsForSchema(tenant.schema_name);
      return {
        totalLogs: m.logsToday,
        activeUsers: m.activeUsers,
        devices: m.devices,
        diskUsedGb: storage?.diskUsedGb ?? 0,
        diskTotalGb: storage?.diskTotalGb ?? 0,
        storageUsedMb: storage?.storageUsedMb,
        storageLimitMb: storage?.storageLimitMb,
        storageProvider: storage?.storageProvider,
        source: "database",
      };
    }

    const schemas = await getActiveTenantSchemas();
    if (schemas.length === 0) throw new Error("No active tenants");

    const parts = await Promise.all(schemas.map((schema) => metricsForSchema(schema)));
    const totalLogs = parts.reduce((sum, p) => sum + p.logsToday, 0);
    const activeUsers = parts.reduce((sum, p) => sum + p.activeUsers, 0);
    const devices = parts.reduce((sum, p) => sum + p.devices, 0);

    return {
      totalLogs,
      activeUsers,
      devices,
      diskUsedGb: storage?.diskUsedGb ?? 0,
      diskTotalGb: storage?.diskTotalGb ?? 0,
      storageUsedMb: storage?.storageUsedMb,
      storageLimitMb: storage?.storageLimitMb,
      storageProvider: storage?.storageProvider,
      source: "database",
    };
  } catch {
    return {
      totalLogs: 0,
      activeUsers: 0,
      devices: 0,
      diskUsedGb: 0,
      diskTotalGb: 0,
      source: "database",
    };
  }
}
