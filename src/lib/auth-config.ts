export type AuthPortal = "user" | "super_admin";

export interface DemoUser {
  email: string;
  password: string;
  username: string;
  role: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: "admin@cyberlink.com",
    password: "Admin@123456",
    username: "operator1",
    role: "operator",
  },
  {
    email: "superadmin@cyberlink.com",
    password: "Super@Secure2026!",
    username: "admin",
    role: "super_admin",
  },
];

export function getSuperAdminSecurityCode(): string {
  return process.env.SUPER_ADMIN_SECURITY_CODE ?? "CYBER-LINK-2026";
}

export async function authenticateUser(
  email: string,
  password: string,
  portal: AuthPortal
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { db } = await import("@/lib/db");
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

  const demo = DEMO_USERS.find((u) => u.email === normalizedEmail);
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
