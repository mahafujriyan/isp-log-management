import { env } from "@isp/core/config/env.config";
import { NextResponse } from "next/server";
import { apiError, canIngestLogs } from "@isp/core/utils/api.utils";
import { receiveSyslogBatch, receiveSyslogMessage } from "@isp/core/services/syslog-ingest.service";

/**
 * GET /api/logs/receive — ingest endpoint health (no auth)
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/logs/receive",
    method: "POST",
    ingest_secret_configured: Boolean(env.ingest.secret),
    default_tenant_schema: process.env.DEFAULT_TENANT_SCHEMA ?? "tenant_001",
    mikrotik_note:
      "MikroTik sends UDP syslog to port 514 (isp-syslog-listener PM2) — HTTP ingest is for tests/forwarding only",
    required_headers: {
      "Content-Type": "text/plain (recommended) or application/json",
      "x-ingest-secret": "must match INGEST_SECRET in .env.production.local",
      "x-router-ip": "optional — e.g. 160.187.175.26",
    },
    example_curl:
      'curl -X POST http://160.187.175.30:3002/api/logs/receive -H "Content-Type: text/plain" -H "x-ingest-secret: YOUR_INGEST_SECRET" -H "x-router-ip: 160.187.175.26" -d "<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info pppoe_user=test@clc ..."',
  });
}

/**
 * POST /api/logs/receive
 * Accept raw MikroTik syslog (single line, batch, or JSON).
 * Auth: session (LOGS_INGEST) or x-ingest-secret header.
 */
export async function POST(request: Request) {
  const access = await canIngestLogs(request);
  if (!access.allowed) {
    return apiError(access.reason ?? "Forbidden — sign in or provide x-ingest-secret header", 403);
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const routerIp = request.headers.get("x-router-ip") ?? undefined;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;

      if (Array.isArray(body.messages)) {
        const batch = (body.messages as Array<Record<string, unknown>>).map((m) => ({
          raw_message: String(m.raw_message ?? m.message ?? ""),
          router_ip: typeof m.router_ip === "string" ? m.router_ip : routerIp,
          tenant_id: m.tenant_id != null ? Number(m.tenant_id) : undefined,
          schema: typeof m.schema === "string" ? m.schema : undefined,
        }));
        const result = await receiveSyslogBatch(batch);
        return NextResponse.json(result, { status: 201 });
      }

      const rawMessage = String(body.raw_message ?? body.message ?? "");
      if (!rawMessage) return apiError("raw_message is required", 400);

      const result = await receiveSyslogMessage({
        raw_message: rawMessage,
        router_ip: typeof body.router_ip === "string" ? body.router_ip : routerIp,
        tenant_id: body.tenant_id != null ? Number(body.tenant_id) : undefined,
        schema: typeof body.schema === "string" ? body.schema : undefined,
        auto_register_router: body.auto_register_router !== false,
      });

      if (!result.ok) return apiError(result.error ?? "Ingest failed", 400);
      return NextResponse.json(result, { status: 201 });
    }

    const raw = (await request.text()).trim();
    if (!raw) return apiError("Empty syslog body", 400);

    const result = await receiveSyslogMessage({ raw_message: raw, router_ip: routerIp });
    if (!result.ok) return apiError(result.error ?? "Ingest failed", 400);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(
      "Receive failed",
      500,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
