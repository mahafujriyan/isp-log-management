import { env } from "@isp/core/config";
import { db } from "@isp/core/lib/database";
import { bytesToGb, bytesToMb } from "@isp/core/utils/storage.utils";

const PRISMA_PLAN_LIMIT_MB: Record<string, number> = {
  free: 512,
  starter: 10_240,
  pro: 51_200,
  business: 102_400,
};

function resolveStorageLimitBytes(): number {
  const limitMb = process.env.DATABASE_STORAGE_LIMIT_MB;
  if (limitMb) return Number(limitMb) * 1024 ** 2;

  const limitGb = process.env.DATABASE_STORAGE_LIMIT_GB;
  if (limitGb) return Number(limitGb) * 1024 ** 3;

  const url = env.database.url ?? "";
  if (url.includes("prisma.io")) {
    const plan = process.env.PRISMA_PLAN?.toLowerCase();
    if (plan && PRISMA_PLAN_LIMIT_MB[plan]) {
      return PRISMA_PLAN_LIMIT_MB[plan] * 1024 ** 2;
    }
    return PRISMA_PLAN_LIMIT_MB.free * 1024 ** 2;
  }

  return 0;
}

export async function getDatabaseStorageMetrics(): Promise<{
  diskUsedGb: number;
  diskTotalGb: number;
  storageUsedMb: number;
  storageLimitMb: number;
  storageProvider: string;
  usedBytes: number;
  limitBytes: number;
}> {
  const row = await db.getOne<{ bytes: string }>(
    "SELECT pg_database_size(current_database())::text AS bytes"
  );
  const usedBytes = Number(row?.bytes ?? 0);
  const limitBytes = resolveStorageLimitBytes();
  const url = env.database.url ?? "";
  const storageProvider = url.includes("prisma.io") ? "Prisma Postgres" : "PostgreSQL";

  return {
    usedBytes,
    limitBytes,
    storageUsedMb: bytesToMb(usedBytes),
    storageLimitMb: limitBytes > 0 ? bytesToMb(limitBytes) : 0,
    diskUsedGb: bytesToGb(usedBytes),
    diskTotalGb: limitBytes > 0 ? bytesToGb(limitBytes) : 0,
    storageProvider,
  };
}
