import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      username?: string;
      tenantId?: number;
      accountType?: string;
      demoExpiresAt?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    tenant_id?: number | null;
    account_type?: string;
    demo_expires_at?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    username?: string;
    tenantId?: number;
    accountType?: string;
    demoExpiresAt?: string | null;
  }
}
