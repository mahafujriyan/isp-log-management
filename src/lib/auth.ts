import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authenticateUser,
  getSuperAdminSecurityCode,
  type AuthPortal,
} from "@/lib/auth-config";

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
    signIn: "/auth/login",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
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
