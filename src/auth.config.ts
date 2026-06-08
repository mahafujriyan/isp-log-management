import type { NextAuthConfig } from "next-auth";
import { AUTH_CONFIG } from "@/config/auth.config";
import type { AuthUser } from "@/types/auth.types";

export const nextAuthConfig = {
  pages: {
    signIn: AUTH_CONFIG.pages.signIn,
  },
  session: AUTH_CONFIG.session,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.sub = user.id;
        token.role = authUser.role;
        token.username = user.name ?? undefined;
        token.tenantId = authUser.tenant_id ?? undefined;
        token.accountType = authUser.account_type ?? "standard";
        token.demoExpiresAt = authUser.demo_expires_at ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.tenantId = token.tenantId as number | undefined;
        session.user.accountType = token.accountType as string | undefined;
        session.user.demoExpiresAt = (token.demoExpiresAt as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
