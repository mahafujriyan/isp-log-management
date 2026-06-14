export type AuthPortal = "user" | "super_admin";

export interface DemoUser {
  email: string;
  password: string;
  username: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id?: number | null;
  account_type?: string;
  demo_expires_at?: string | null;
}
