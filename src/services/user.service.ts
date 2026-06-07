import { db } from "@/lib/database";
import type { User } from "@/types";

export async function listUsers(): Promise<User[]> {
  return db.getMany<User>(
    "SELECT id, tenant_id, username, email, role, is_active, created_at FROM public.users ORDER BY created_at DESC"
  );
}

export async function getUserById(id: number): Promise<User | null> {
  return db.getOne<User>(
    "SELECT id, tenant_id, username, email, role, is_active, created_at FROM public.users WHERE id = $1",
    [id]
  );
}
