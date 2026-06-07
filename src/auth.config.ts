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
        token.sub = user.id;
        token.role = (user as AuthUser).role;
        token.username = user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
