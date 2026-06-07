/**
 * PM2 process manager config (PHASE 7 self-hosted)
 *
 * Usage (from project root):
 *   npm run build
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "isp-logserver",
      cwd: path.join(__dirname, ".."),
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
