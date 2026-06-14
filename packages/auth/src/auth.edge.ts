/**
 * Edge-safe auth for middleware only — no Credentials provider, no pg/bcrypt.
 * API routes and login use `@/auth` instead.
 */
import NextAuth from "next-auth";
import { nextAuthConfig } from "./auth.config";

export const { auth } = NextAuth(nextAuthConfig);
