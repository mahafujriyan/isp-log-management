import { createDemoRequest } from "@isp/core/services/demo-request.service";
import { corsHeaders, handleCorsPreflight, jsonWithCors } from "@isp/core/utils/cors.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
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
