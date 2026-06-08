import { db } from "@/lib/database";
import type { User } from "@/types";
import type { AppRole } from "@/constants/roles.constants";
import { isAppRole } from "@/utils/rbac.utils";

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: AppRole;
  tenant_id?: number | null;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  role?: AppRole;
  is_active?: boolean;
}

export async function listUsers(): Promise<User[]> {
  return db.getMany<User>(
    `SELECT id, tenant_id, username, email, role, is_active, created_at
     FROM public.users
     ORDER BY created_at DESC`
  );
}

export async function getUserById(id: number): Promise<User | null> {
  return db.getOne<User>(
    `SELECT id, tenant_id, username, email, role, is_active, created_at
     FROM public.users WHERE id = $1`,
    [id]
  );
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(input.password, 10);

  if (!isAppRole(input.role)) {
    throw new Error("Invalid role");
  }

  const row = await db.getOne<User>(
    `INSERT INTO public.users (tenant_id, username, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, tenant_id, username, email, role, is_active, created_at`,
    [
      input.tenant_id ?? null,
      input.username.trim(),
      input.email.trim().toLowerCase(),
      hash,
      input.role,
    ]
  );

  if (!row) throw new Error("Failed to create user");
  return row;
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const existing = await getUserById(id);
  if (!existing) throw new Error("User not found");

  let passwordHash: string | undefined;
  if (input.password) {
    const bcrypt = await import("bcryptjs");
    passwordHash = await bcrypt.hash(input.password, 10);
  }

  if (input.role && !isAppRole(input.role)) {
    throw new Error("Invalid role");
  }

  const row = await db.getOne<User>(
    `UPDATE public.users SET
       username = COALESCE($2, username),
       email = COALESCE($3, email),
       password_hash = COALESCE($4, password_hash),
       role = COALESCE($5, role),
       is_active = COALESCE($6, is_active)
     WHERE id = $1
     RETURNING id, tenant_id, username, email, role, is_active, created_at`,
    [
      id,
      input.username?.trim(),
      input.email?.trim().toLowerCase(),
      passwordHash ?? null,
      input.role ?? null,
      input.is_active ?? null,
    ]
  );

  if (!row) throw new Error("Failed to update user");
  return row;
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await db.query("DELETE FROM public.users WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
