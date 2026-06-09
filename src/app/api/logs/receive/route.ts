import { NextResponse } from "next/server";
import { apiError, canIngestLogs } from "@/utils/api.utils";
import { receiveSyslogBatch, receiveSyslogMessage } from "@/services/syslog-ingest.service";

/**
 * POST /api/logs/receive
 * Accept raw MikroTik syslog (single line, batch, or rsyslog-forwarded JSON).
 * Auth: session (LOGS_INGEST) or x-ingest-secret header.
 */
export async function POST(request: Request) {
  const access = await canIngestLogs(request);
  if (!access.allowed) {
    return apiError("Forbidden — sign in or provide x-ingest-secret header", 403);
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const routerIp = request.headers.get("x-router-ip") ?? undefined;

    if (contentType.includes("text/plain")) {
      const raw = (await request.text()).trim();
      if (!raw) return apiError("Empty syslog body", 400);
      const result = await receiveSyslogMessage({ raw_message: raw, router_ip: routerIp });
      if (!result.ok) return apiError(result.error ?? "Ingest failed", 400);
      return NextResponse.json(result, { status: 201 });
    }

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
  } catch (error) {
    return apiError(
      "Receive failed",
      500,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
