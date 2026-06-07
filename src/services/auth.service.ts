import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AUTH_CONFIG, getSuperAdminSecurityCode } from "@/config/auth.config";
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
        securityCode: { label: "Security Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const portal = (credentials?.portal as AuthPortal | undefined) ?? "user";
        const securityCode = credentials?.securityCode as string | undefined;

        if (!email || !password) return null;

        if (portal === "super_admin") {
          if (securityCode !== getSuperAdminSecurityCode()) {
            throw new Error("Invalid security authorization code");
          }
        }

        return authenticateUser(email, password, portal);
      },
    }),
  ],
  pages: {
    signIn: AUTH_CONFIG.pages.signIn,
  },
  session: AUTH_CONFIG.session,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as AuthUser).role;
        token.username = user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  trustHost: true,
});
