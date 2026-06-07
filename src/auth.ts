import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { nextAuthConfig } from "@/auth.config";
import { getSuperAdminSecurityCode } from "@/config/auth.config";
import type { AuthPortal } from "@/types/auth.types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...nextAuthConfig,
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

        const { authenticateUser } = await import("@/services/auth.service");
        return authenticateUser(email, password, portal);
      },
    }),
  ],
});
