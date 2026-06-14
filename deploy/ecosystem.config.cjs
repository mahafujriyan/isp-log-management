/**
 * PM2 — VPS production (3 portals + Syslog listener)
 *
 *   cp deploy/env.vps.example .env.production.local   # edit secrets
 *   npm run build:all
 *   npm run pm2:start
 *   pm2 save && pm2 startup
 */
const path = require("path");
const loadProductionEnv = require("./load-env.cjs");

const root = path.join(__dirname, "..");
const env = loadProductionEnv();

const sharedEnv = {
  ...env,
  NODE_ENV: "production",
  AUTH_COOKIE_SECURE: env.AUTH_COOKIE_SECURE ?? "false",
};

module.exports = {
  apps: [
    {
      name: "isp-marketing",
      cwd: path.join(root, "apps/marketing"),
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "384M",
      env: {
        ...sharedEnv,
        PORT: env.MARKETING_PORT || "3000",
        NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_MARKETING_URL || env.NEXT_PUBLIC_APP_URL || "http://160.187.175.30",
        NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL || env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
        NEXT_PUBLIC_OPERATOR_URL: env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
        NEXT_PUBLIC_ADMIN_URL: env.NEXT_PUBLIC_ADMIN_URL || "http://160.187.175.30:3001",
        NEXT_PUBLIC_MARKETING_URL: env.NEXT_PUBLIC_MARKETING_URL || "http://160.187.175.30:3000",
      },
    },
    {
      name: "isp-super-admin",
      cwd: path.join(root, "apps/super-admin"),
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "384M",
      env: {
        ...sharedEnv,
        PORT: env.ADMIN_PORT || "3001",
        AUTH_URL: env.AUTH_ADMIN_URL || env.NEXT_PUBLIC_ADMIN_URL || "http://160.187.175.30:3001",
        NEXTAUTH_URL: env.AUTH_ADMIN_URL || env.NEXT_PUBLIC_ADMIN_URL || "http://160.187.175.30:3001",
        NEXT_PUBLIC_OPERATOR_URL: env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
        NEXT_PUBLIC_ADMIN_URL: env.NEXT_PUBLIC_ADMIN_URL || "http://160.187.175.30:3001",
      },
    },
    {
      name: "isp-operator",
      cwd: path.join(root, "apps/operator"),
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        ...sharedEnv,
        PORT: env.OPERATOR_PORT || "3002",
        AUTH_URL: env.AUTH_OPERATOR_URL || env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
        NEXTAUTH_URL: env.AUTH_OPERATOR_URL || env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
        NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
        NEXT_PUBLIC_SOCKET_URL: env.NEXT_PUBLIC_SOCKET_URL || env.NEXT_PUBLIC_OPERATOR_URL || "http://160.187.175.30:3002",
      },
    },
    {
      name: "isp-syslog-listener",
      cwd: path.join(root, "workers/syslog-listener"),
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
      env: {
        ...sharedEnv,
        SYSLOG_UDP_PORT: env.SYSLOG_UDP_PORT || "514",
        SOCKET_PORT: env.SOCKET_PORT || "3001",
        SYSLOG_FILE: env.SYSLOG_FILE || "/var/log/mikrotik/isp-syslog.log",
      },
    },
  ],
};
