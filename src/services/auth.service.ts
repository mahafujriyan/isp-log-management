import { AUTH_CONFIG } from "@/config/auth.config";
import { db } from "@/lib/database";
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
    }>(
      "SELECT id, email, username, password_hash, role FROM public.users WHERE LOWER(email) = $1 AND is_active = true",
      [normalizedEmail]
    );

    if (user?.password_hash) {
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return null;
      if (portal === "super_admin" && user.role !== "super_admin") return null;
      if (portal === "user" && user.role === "super_admin") return null;
      return {
        id: String(user.id),
        email: user.email,
        name: user.username,
        role: user.role,
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
