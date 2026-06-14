import { createUser, listUsers } from "@isp/core/services/user.service";
import { apiError, rejectDemoWrite, requirePermission } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { isDemoAccount } from "@isp/core/constants/roles.constants";
import { isAppRole } from "@isp/core/utils/rbac.utils";
import { NextResponse } from "next/server";

function demoSampleUsers(tenantId: number) {
  const now = new Date().toISOString();
  return [
    { id: 9001, tenant_id: tenantId, username: "karim_noc", email: "noc@demosandbox.local", role: "operator", is_active: true, account_type: "standard", created_at: now },
    { id: 9002, tenant_id: tenantId, username: "sadia_ops", email: "ops@demosandbox.local", role: "viewer", is_active: true, account_type: "standard", created_at: now },
    { id: 9003, tenant_id: tenantId, username: "imran_field", email: "field@demosandbox.local", role: "viewer", is_active: true, account_type: "standard", created_at: now },
  ];
}

export async function GET() {
  const { error, session } = await requirePermission("USERS_READ");
  if (error) return error;

  if (isDemoAccount(session?.user?.role, session?.user?.accountType) && session?.user?.tenantId) {
    return NextResponse.json(demoSampleUsers(session.user.tenantId));
  }

  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("USER_WRITE");
  if (error) return error;

  try {
    const body = await request.json();
    const role = String(body.role ?? "viewer");
    if (!isAppRole(role)) {
      return apiError("Invalid role", 400);
    }

    const user = await createUser({
      username: body.username,
      email: body.email,
      password: body.password,
      role,
      tenant_id: body.tenant_id != null ? Number(body.tenant_id) : null,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
