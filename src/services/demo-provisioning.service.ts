import { db } from "@/lib/database";
import { provisionTenantSchema } from "@/services/tenant.service";
import type { ProvisionDemoResult } from "@/types/demo-request.types";
import type { Tenant, User } from "@/types";
import {
  getDemoRequestById,
  updateDemoRequestStatus,
} from "@/services/demo-request.service";
import { upsertDemoUser } from "@/services/demo-user.service";

export async function getDemoSandboxTenant(): Promise<Tenant> {
  const existing = await db.getOne<Tenant>(
    `SELECT * FROM public.tenants WHERE is_demo_sandbox = TRUE LIMIT 1`
  );
  if (existing) return existing;
  return ensureDemoSandboxTenant();
}

export async function ensureDemoSandboxTenant(): Promise<Tenant> {
  const existing = await db.getOne<Tenant>(
    `SELECT * FROM public.tenants WHERE is_demo_sandbox = TRUE LIMIT 1`
  );
  if (existing) return existing;

  const tenant = await db.getOne<Tenant>(
    `INSERT INTO public.tenants
      (admin_name, admin_email, schema_name, plan_id, status, expires_at, is_demo_sandbox)
     VALUES ('Demo Sandbox', 'demo@sandbox.local', $1, 1, 'active', NOW() + INTERVAL '10 years', TRUE)
     RETURNING *`,
    [DEMO_SCHEMA]
  );

  if (!tenant) throw new Error("Failed to create demo sandbox tenant");

  await provisionTenantSchema(DEMO_SCHEMA);

  await db.query(
    `INSERT INTO tenant_demo.syslogs (
      pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port,
      visited_ip, visited_port, protocol, country_code, city
    )
    SELECT * FROM (VALUES
      ('demo_user@isp', 'AA:BB:CC:DD:EE:01', '10.70.1.10'::inet, 51234, '160.187.175.200'::inet, 443, '142.250.185.46'::inet, 443, 'TCP', 'US', 'Mountain View'),
      ('demo_user@isp', 'AA:BB:CC:DD:EE:02', '10.70.1.11'::inet, 49821, '160.187.175.201'::inet, 8080, '104.21.45.12'::inet, 443, 'TCP', 'US', 'San Francisco'),
      ('guest_demo', 'AA:BB:CC:DD:EE:03', '10.70.2.5'::inet, 60102, '160.187.175.202'::inet, 53, '8.8.8.8'::inet, 53, 'UDP', 'US', NULL)
    ) AS v(pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port, visited_ip, visited_port, protocol, country_code, city)
    WHERE NOT EXISTS (SELECT 1 FROM tenant_demo.syslogs LIMIT 1)`
  );

  return tenant;
}

function toDurationMinutes(value: number, unit: "minutes" | "hours"): number {
  const n = Math.max(1, Math.floor(value));
  return unit === "hours" ? n * 60 : n;
}

function usernameFromRequest(fullName: string, email: string): string {
  const fromName = fullName.trim().split(/\s+/)[0];
  if (fromName.length >= 2) return fromName.slice(0, 64);
  return email.split("@")[0].slice(0, 64);
}

export async function provisionDemoFromRequest(input: {
  requestId: number;
  password: string;
  durationValue: number;
  durationUnit: "minutes" | "hours";
  appUrl: string;
}): Promise<ProvisionDemoResult> {
  const request = await getDemoRequestById(input.requestId);
  if (!request) throw new Error("Demo request not found");
  if (request.status === "provisioned" && request.demo_expires_at) {
    const stillActive = new Date(request.demo_expires_at) > new Date();
    if (stillActive) throw new Error("This request already has an active demo account");
  }

  if (!input.password || input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const durationMinutes = toDurationMinutes(input.durationValue, input.durationUnit);
  const sandbox = await getDemoSandboxTenant();
  const email = request.email.trim().toLowerCase();

  const existingStandard = await db.getOne<{ id: number; account_type: string }>(
    `SELECT id, account_type FROM public.users WHERE LOWER(email) = $1 AND account_type != 'demo'`,
    [email]
  );
  if (existingStandard) {
    throw new Error("This email belongs to a production account and cannot be used for demo");
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60_000);
  const user = await upsertDemoUser({
    email,
    username: usernameFromRequest(request.full_name, email),
    password: input.password,
    tenant_id: sandbox.id,
    demo_expires_at: expiresAt.toISOString(),
  });

  const updated = await updateDemoRequestStatus(request.id, "provisioned", {
    provisioned_user_id: user.id,
    provisioned_tenant_id: sandbox.id,
    provisioned_at: new Date().toISOString(),
    demo_expires_at: expiresAt.toISOString(),
    duration_minutes: durationMinutes,
  });

  if (!updated) throw new Error("Failed to update demo request");

  return {
    request: updated,
    user_id: user.id,
    email: user.email,
    username: user.username,
    tenant_id: sandbox.id,
    schema_name: sandbox.schema_name,
    demo_expires_at: expiresAt.toISOString(),
    login_url: `${input.appUrl.replace(/\/$/, "")}/auth/login`,
  };
}

export async function expireDemoAccounts(): Promise<{ users: number; requests: number }> {
  const users = await db.query(
    `UPDATE public.users
     SET is_active = FALSE
     WHERE account_type = 'demo'
       AND demo_expires_at IS NOT NULL
       AND demo_expires_at < NOW()
       AND is_active = TRUE`
  );

  const requests = await db.query(
    `UPDATE public.demo_requests
     SET status = 'expired'
     WHERE status = 'provisioned'
       AND demo_expires_at IS NOT NULL
       AND demo_expires_at < NOW()`
  );

  return {
    users: users.rowCount ?? 0,
    requests: requests.rowCount ?? 0,
  };
}

export async function isDemoUserExpired(user: Pick<User, "account_type" | "demo_expires_at" | "is_active">): Promise<boolean> {
  if (user.account_type !== "demo") return false;
  if (!user.demo_expires_at) return false;
  return new Date(user.demo_expires_at) <= new Date();
}
