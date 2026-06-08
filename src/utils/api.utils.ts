import { auth } from "@/auth";
import { env } from "@/config/env.config";
import { PERMISSIONS, isDemoAccount, type Permission } from "@/constants/roles.constants";
import { hasRole } from "@/utils/rbac.utils";
import { NextResponse } from "next/server";

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

/** Demo users are locked to their sandbox tenant; production users may pass tenant_id. */
export async function resolveTenantScope(requested?: number): Promise<{
  tenant_id: number | undefined;
  error?: NextResponse;
}> {
  const session = await auth();
  const role = session?.user?.role;
  const accountType = session?.user?.accountType;
  const sessionTenantId = session?.user?.tenantId;

  if (isDemoAccount(role, accountType)) {
    if (!sessionTenantId) {
      return { tenant_id: undefined, error: apiError("Demo account misconfigured", 403) };
    }
    if (requested && requested !== sessionTenantId) {
      return {
        tenant_id: undefined,
        error: apiError("Forbidden — demo accounts cannot access production data", 403),
      };
    }
    return { tenant_id: sessionTenantId };
  }

  return { tenant_id: requested };
}

export async function rejectDemoWrite(): Promise<NextResponse | null> {
  const session = await auth();
  if (isDemoAccount(session?.user?.role, session?.user?.accountType)) {
    return apiError("Demo accounts are read-only previews", 403);
  }
  return null;
}
