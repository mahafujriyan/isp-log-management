#!/usr/bin/env bash
# ISP Log Management — Ubuntu VPS one-time setup
# Run as root on 160.187.175.30 (or your log server)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/isp-log-management}"
REPO_URL="${REPO_URL:-}"

echo "==> ISP Log Server VPS setup"

apt-get update -y
apt-get install -y curl git nginx rsyslog ufw

# Node.js 20 LTS
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2 tsx

mkdir -p /var/log/mikrotik
chown syslog:adm /var/log/mikrotik 2>/dev/null || chown root:adm /var/log/mikrotik

# rsyslog backup + MikroTik rules
if [ -f "$APP_DIR/deploy/rsyslog/mikrotik.conf" ]; then
  cp "$APP_DIR/deploy/rsyslog/mikrotik.conf" /etc/rsyslog.d/50-mikrotik.conf
  systemctl restart rsyslog
fi

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 514/udp
echo "y" | ufw enable || true

cd "$APP_DIR"

if [ ! -f .env.production.local ]; then
  cp deploy/env.vps.example .env.production.local
  echo "!! Edit $APP_DIR/.env.production.local (DATABASE_URL, secrets) then re-run build"
fi

npm ci
npm run build
npm run db:syslog || true
npm run db:register-sfp1 || true

# Allow Node to bind UDP 514 without root
NODE_BIN="$(readlink -f "$(which node)")"
setcap 'cap_net_bind_service=+ep' "$NODE_BIN" 2>/dev/null || echo "Note: run listener as root or use SYSLOG_UDP_PORT=5514"

pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u "${SUDO_USER:-root}" --hp "${HOME}" || true

cp deploy/nginx/logserver.conf /etc/nginx/sites-available/isp-logserver
ln -sf /etc/nginx/sites-available/isp-logserver /etc/nginx/sites-enabled/isp-logserver
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== DONE ==="
echo "Dashboard:  http://160.187.175.30"
echo "Health:     http://160.187.175.30/api/health"
echo "Socket:     http://160.187.175.30/socket.io/"
echo "MikroTik:   remote syslog → 160.187.175.30:514"
echo "Import:     deploy/mikrotik/clc-production.rsc on router 160.187.175.26"
echo "Test:       npm run test:log-ingest"
