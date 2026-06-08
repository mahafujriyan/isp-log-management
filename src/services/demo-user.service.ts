import { db } from "@/lib/database";
import type { User } from "@/types";

export async function getUserByEmail(email: string): Promise<User | null> {
  return db.getOne<User>(
    `SELECT id, tenant_id, username, email, role, is_active, account_type, demo_expires_at, created_at
     FROM public.users WHERE LOWER(email) = $1`,
    [email.trim().toLowerCase()]
  );
}

export async function upsertDemoUser(input: {
  email: string;
  username: string;
  password: string;
  tenant_id: number;
  demo_expires_at: string;
}): Promise<User> {
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(input.password, 10);
  const email = input.email.trim().toLowerCase();

  const existing = await getUserByEmail(email);

  if (existing?.account_type === "demo") {
    const row = await db.getOne<User>(
      `UPDATE public.users SET
         username = $2,
         password_hash = $3,
         tenant_id = $4,
         role = 'operator',
         account_type = 'demo',
         demo_expires_at = $5,
         is_active = TRUE
       WHERE id = $1
       RETURNING id, tenant_id, username, email, role, is_active, account_type, demo_expires_at, created_at`,
      [existing.id, input.username.trim(), hash, input.tenant_id, input.demo_expires_at]
    );
    if (!row) throw new Error("Failed to renew demo user");
    return row;
  }

  const row = await db.getOne<User>(
    `INSERT INTO public.users
      (tenant_id, username, email, password_hash, role, account_type, demo_expires_at, is_active)
     VALUES ($1, $2, $3, $4, 'operator', 'demo', $5, TRUE)
     RETURNING id, tenant_id, username, email, role, is_active, account_type, demo_expires_at, created_at`,
    [input.tenant_id, input.username.trim(), email, hash, input.demo_expires_at]
  );

  if (!row) throw new Error("Failed to create demo user");
  return row;
}

export async function deactivateDemoUser(id: number): Promise<void> {
  await db.query(
    `UPDATE public.users SET is_active = FALSE WHERE id = $1 AND account_type = 'demo'`,
    [id]
  );
}
