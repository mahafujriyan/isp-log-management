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
}
