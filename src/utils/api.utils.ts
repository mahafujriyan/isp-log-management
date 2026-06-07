import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/config/env.config";
import { PERMISSIONS, type Permission } from "@/constants/roles.constants";
import { hasRole } from "@/utils/rbac.utils";

export function apiError(message: string, status = 500, detail?: string) {
  return NextResponse.json(
    { error: message, ...(detail ? { detail } : {}) },
    { status }
  );
}

export function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const n = Number(value ?? fallback);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max !== undefined) return Math.min(n, max);
  return n;
}

export async function requireSessionRoles(roles: readonly string[]) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !hasRole(role, roles)) {
    return { session: null, error: apiError("Forbidden", 403) as NextResponse };
  }
  return { session, error: null };
}

export async function requirePermission(permission: Permission) {
  return requireSessionRoles(PERMISSIONS[permission]);
}

export async function canIngestLogs(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (session && hasRole(role, PERMISSIONS.LOGS_INGEST)) {
    return { allowed: true as const, session };
  }

  const secret = request.headers.get("x-ingest-secret");
  if (secret && env.ingest.secret && secret === env.ingest.secret) {
    return { allowed: true as const, session: null };
  }

  return { allowed: false as const, session: null };
}
