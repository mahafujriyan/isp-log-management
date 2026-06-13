/**
 * PM2 — VPS production (Next.js + Syslog listener)
 *
 *   cp deploy/env.vps.example .env.production.local   # edit secrets
 *   npm run build
 *   npm run pm2:start
 *   pm2 save && pm2 startup
 */
const path = require("path");
const loadProductionEnv = require("./load-env.cjs");

const root = path.join(__dirname, "..");
const env = loadProductionEnv();

module.exports = {
  apps: [
    {
      name: "isp-logserver",
      cwd: root,
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        ...env,
        PORT: env.PORT || "3000",
      },
    },
    {
      name: "isp-syslog-listener",
      cwd: root,
      script: "npx",
      args: "tsx src/services/syslog-listener/run.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
      env: {
        ...env,
        SYSLOG_UDP_PORT: env.SYSLOG_UDP_PORT || "514",
        SOCKET_PORT: env.SOCKET_PORT || "3001",
        SYSLOG_FILE: env.SYSLOG_FILE || "/var/log/mikrotik/isp-syslog.log",
      },
    },
  ],
};
