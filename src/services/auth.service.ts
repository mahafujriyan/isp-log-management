import { AUTH_CONFIG } from "@/config/auth.config";
import { db } from "@/lib/database";
import { deactivateDemoUser } from "@/services/demo-user.service";
import type { AuthPortal, AuthUser } from "@/types/auth.types";

export async function authenticateUser(
  email: string,
  password: string,
  portal: AuthPortal
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await db.getOne<{
      id: number;
      email: string;
      username: string;
      password_hash: string;
      role: string;
      tenant_id: number | null;
      account_type: string | null;
      demo_expires_at: string | null;
    }>(
      `SELECT id, email, username, password_hash, role, tenant_id, account_type, demo_expires_at
       FROM public.users
       WHERE LOWER(email) = $1 AND is_active = TRUE`,
      [normalizedEmail]
    );

    if (user?.password_hash) {
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return null;

      if (user.account_type === "demo" && user.demo_expires_at) {
        if (new Date(user.demo_expires_at) <= new Date()) {
          await deactivateDemoUser(user.id);
          return null;
        }
      }

      if (portal === "super_admin" && user.role !== "super_admin") return null;
      if (portal === "user" && user.role === "super_admin") return null;

      return {
        id: String(user.id),
        email: user.email,
        name: user.username,
        role: user.role,
        tenant_id: user.tenant_id,
        account_type: user.account_type ?? "standard",
        demo_expires_at: user.demo_expires_at,
      };
    }
  } catch {
    // Fall through to demo users when database is unavailable
  }

  const demo = AUTH_CONFIG.demoUsers.find((u) => u.email === normalizedEmail);
  if (!demo || demo.password !== password) return null;
  if (portal === "super_admin" && demo.role !== "super_admin") return null;
  if (portal === "user" && demo.role === "super_admin") return null;

  return {
    id: demo.email,
    email: demo.email,
    name: demo.username,
    role: demo.role,
  };
}
