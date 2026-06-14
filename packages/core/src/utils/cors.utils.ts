import { NextResponse } from "next/server";

function allowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000",
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
    process.env.NEXT_PUBLIC_OPERATOR_URL ?? "http://localhost:3002",
  ];
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPreflight(request: Request): NextResponse | null {
  if (request.method !== "OPTIONS") return null;
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonWithCors(
  request: Request,
  data: unknown,
  init?: ResponseInit
): NextResponse {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return NextResponse.json(data, { ...init, headers });
}
