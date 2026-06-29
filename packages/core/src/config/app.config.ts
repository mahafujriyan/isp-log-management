import { env } from "@isp/core/config/env.config";

export const APP_CONFIG = {
  name: "ISP Log Server",
  shortName: "ISP Log",
  company: {
    name: "Cyber Link Communication",
    initials: "CL",
    email: "admin@cyberlink.com",
  },
  timezone: "Asia/Dhaka",
  locale: "en-BD",
  url: env.appUrl,
  version: "1.0.0",
} as const;

export const DB_CONFIG = {
  pool: {
    max: Number(process.env.DATABASE_POOL_MAX) || (process.env.NODE_ENV === "production" ? 3 : 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  },
} as const;
