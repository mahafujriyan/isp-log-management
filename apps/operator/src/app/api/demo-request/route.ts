import { createDemoRequest } from "@isp/core/services/demo-request.service";
import { corsHeaders, handleCorsPreflight, jsonWithCors } from "@isp/core/utils/cors.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { checkRateLimit } from "@isp/core/lib/security/rate-limit";
import { recordSecurityEvent } from "@isp/core/services/security-events.service";
import { getClientIp, getDeviceId } from "@isp/core/utils/net.utils";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "১ device থেকে max 3, ১ IP থেকে max 5" account requests per 10 minutes.
const WINDOW_SECONDS = 10 * 60;
const DEVICE_LIMIT = 3;
const IP_LIMIT = 5;

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const deviceId = getDeviceId(request);

  try {
    // Per-IP and per-device throttling before doing any work.
    const [ipLimit, deviceLimit] = await Promise.all([
      checkRateLimit("account-request:ip", ip, IP_LIMIT, WINDOW_SECONDS),
      checkRateLimit("account-request:device", deviceId, DEVICE_LIMIT, WINDOW_SECONDS),
    ]);

    if (!deviceLimit.allowed || !ipLimit.allowed) {
      const scope = !deviceLimit.allowed ? "device" : "IP";
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, deviceLimit.retryAfterSeconds);
      await recordSecurityEvent({
        event_type: "account_request_blocked",
        severity: "critical",
        ip,
        device_id: deviceId,
        message: `Blocked account request — ${scope} limit exceeded (${
          !deviceLimit.allowed ? `${deviceLimit.count}/${DEVICE_LIMIT} per device` : `${ipLimit.count}/${IP_LIMIT} per IP`
        })`,
        metadata: { scope, ip_count: ipLimit.count, device_count: deviceLimit.count },
      });
      return jsonWithCors(
        request,
        {
          error:
            "Too many requests from this " +
            (scope === "device" ? "device" : "network") +
            ". Please try again later.",
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const body = await request.json();

    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const company = String(body.company ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const plan_interest = String(body.plan_interest ?? "").trim();
    const message = String(body.message ?? "").trim();
    const source = String(body.source ?? "landing").trim();

    if (!full_name || full_name.length < 2) {
      return jsonWithCors(request, { error: "Please enter your full name." }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return jsonWithCors(request, { error: "Please enter a valid work email." }, { status: 400 });
    }
    if (!company || company.length < 2) {
      return jsonWithCors(request, { error: "Please enter your company or ISP name." }, { status: 400 });
    }

    const record = await createDemoRequest({
      full_name,
      email,
      company,
      phone,
      plan_interest,
      message,
      source,
    });

    await recordSecurityEvent({
      event_type: "account_request",
      severity: "info",
      ip,
      device_id: deviceId,
      email,
      message: `New account/demo request from ${email} (${company})`,
    });

    return jsonWithCors(
      request,
      {
        ok: true,
        message: "Thanks! Our team will contact you within 24 hours.",
        id: record.id,
      },
      { status: 201 }
    );
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, {
      status: mapped.status,
      headers: corsHeaders(request),
    });
  }
}
