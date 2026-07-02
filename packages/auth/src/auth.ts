import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { nextAuthConfig } from "./auth.config";
import { getSuperAdminSecurityCode } from "@isp/core/config/auth.config";
import type { AuthPortal } from "@isp/core/types/auth.types";

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
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const portal = (credentials?.portal as AuthPortal | undefined) ?? "user";
        const securityCode = credentials?.securityCode as string | undefined;

        if (!email || !password) return null;

        const [{ checkRateLimit, peekRateLimit, resetRateLimit }, { recordSecurityEvent }, { getClientIp }] =
          await Promise.all([
            import("@isp/core/lib/security/rate-limit"),
            import("@isp/core/services/security-events.service"),
            import("@isp/core/utils/net.utils"),
          ]);

        const ip = request instanceof Request ? getClientIp(request) : "unknown";
        const normalizedEmail = email.trim().toLowerCase();
        const LOGIN_MAX_FAILURES = 5;
        const LOGIN_WINDOW_SECONDS = 10 * 60;

        // Brute-force lockout: block once too many recent failures from this IP.
        const failures = await peekRateLimit("login:ip", ip);
        if (failures >= LOGIN_MAX_FAILURES) {
          await recordSecurityEvent({
            event_type: "login_blocked",
            severity: "critical",
            ip,
            email: normalizedEmail,
            message: `Login blocked — ${failures} failed attempts from ${ip} (temporary lockout)`,
            metadata: { portal },
          });
          throw new Error("Too many failed attempts. Please try again in a few minutes.");
        }

        if (portal === "super_admin") {
          if (securityCode !== getSuperAdminSecurityCode()) {
            await recordSecurityEvent({
              event_type: "login_failed",
              severity: "critical",
              ip,
              email: normalizedEmail,
              message: `Invalid super-admin security code from ${ip}`,
              metadata: { portal, reason: "bad_security_code" },
            });
            throw new Error("Invalid security authorization code");
          }
        }

        const { authenticateUser } = await import("@isp/core/services/auth.service");
        const user = await authenticateUser(email, password, portal);

        if (!user) {
          const attempt = await checkRateLimit("login:ip", ip, LOGIN_MAX_FAILURES, LOGIN_WINDOW_SECONDS);
          await recordSecurityEvent({
            event_type: "login_failed",
            severity: "warning",
            ip,
            email: normalizedEmail,
            message: `Failed login for ${normalizedEmail} from ${ip} (attempt ${attempt.count}/${LOGIN_MAX_FAILURES})`,
            metadata: { portal },
          });
          return null;
        }

        // Successful login — clear the failure counter.
        await resetRateLimit("login:ip", ip);
        return user;
      },
    }),
  ],
});
