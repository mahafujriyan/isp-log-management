import { env } from "@/config/env.config";

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
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  },
} as const;
