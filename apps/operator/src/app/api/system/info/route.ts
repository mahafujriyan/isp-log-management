import { db } from "@isp/core/lib/database";
import { getLiveDashboardMetrics } from "@isp/core/services/dashboard.service";
import { apiError, requirePermission } from "@isp/core/utils/api.utils";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  try {
    const dbResult = await db.query("SELECT NOW() as server_time, version() as pg_version");
    const metrics = await getLiveDashboardMetrics();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      serverTime: dbResult.rows[0].server_time,
      postgresVersion: String(dbResult.rows[0].pg_version).split(" ")[1] ?? "unknown",
      nodeVersion: process.version,
      platform: process.platform,
      metrics,
      services: [
        { name: "PostgreSQL", detail: String(dbResult.rows[0].pg_version).split(",")[0], status: "running" },
        { name: "Next.js App", detail: process.env.NODE_ENV ?? "development", status: "running" },
        { name: "Syslog Ingest API", detail: "POST /api/logs/receive", status: "running" },
        { name: "Auth (NextAuth)", detail: "JWT sessions", status: "running" },
      ],
    });
  } catch (err) {
    return apiError(
      "System info unavailable",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
