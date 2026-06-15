#!/usr/bin/env bash
# VPS port diagnostic — run on server: bash deploy/vps-port-check.sh
set -euo pipefail

echo "=== ISP Log Management — Port Check ==="
echo ""

echo "1) PM2 status"
pm2 status 2>/dev/null || echo "PM2 not running or no processes"
echo ""

echo "2) Listening ports (3000-3002, 80, 514)"
sudo ss -tlnp 2>/dev/null | grep -E ':3000|:3001|:3002|:80 ' || echo "No app ports listening"
echo ""

echo "3) UFW firewall"
sudo ufw status 2>/dev/null || echo "ufw not active"
echo ""

echo "4) Local curl (from VPS itself)"
for port in 3000 3001 3002; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1:${port}/" 2>/dev/null || echo "FAIL")
  echo "  :${port} → ${code}"
done
code80=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1/" 2>/dev/null || echo "FAIL")
echo "  :80 (nginx) → ${code80}"
echo ""

echo "5) Env file"
if [ -f .env.production.local ]; then
  echo "  .env.production.local ✓"
  grep -q DATABASE_URL .env.production.local && echo "  DATABASE_URL ✓" || echo "  DATABASE_URL ✗ MISSING"
else
  echo "  .env.production.local ✗ MISSING"
fi
echo ""

echo "6) Build folders"
for app in marketing super-admin operator; do
  if [ -d "apps/${app}/.next" ]; then
    echo "  apps/${app}/.next ✓"
  else
    echo "  apps/${app}/.next ✗ — run: npm run build:all"
  fi
done
echo ""

echo "=== Fix hints ==="
echo "  App not listening → pm2 delete all && npm run pm2:start"
echo "  Local OK, browser timeout → sudo ufw allow 3000/tcp && allow 3001 && allow 3002"
echo "  Or use nginx only → http://160.187.175.30 (port 80, no :3001 needed)"
