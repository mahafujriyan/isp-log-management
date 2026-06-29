#!/usr/bin/env bash
# ISP Log Management — Ubuntu VPS one-time helper
# Full guide: deploy/VPS-HOSTING.md (3 portals + Prisma cloud DB)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/isp-log-management}"

echo "==> ISP Log Server VPS setup (monorepo 3-portal)"
echo "    See deploy/VPS-HOSTING.md for full steps"

apt-get update -y
apt-get install -y curl git nginx rsyslog ufw build-essential

if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2 tsx

mkdir -p /var/log/mikrotik
chown syslog:adm /var/log/mikrotik 2>/dev/null || chown root:adm /var/log/mikrotik

if [ -f "$APP_DIR/deploy/rsyslog/mikrotik.conf" ]; then
  cp "$APP_DIR/deploy/rsyslog/mikrotik.conf" /etc/rsyslog.d/50-mikrotik.conf
  systemctl restart rsyslog
fi

ufw allow OpenSSH
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw allow 3002/tcp
ufw allow 3003/tcp
ufw allow 514/udp
echo "y" | ufw enable || true

cd "$APP_DIR"

if [ ! -f .env.production.local ]; then
  cp deploy/env.vps.example .env.production.local
  echo "!! Edit $APP_DIR/.env.production.local — run: sudo bash deploy/vps-postgres-setup.sh first"
  exit 1
fi

if ! command -v psql &>/dev/null; then
  echo "!! PostgreSQL not installed — run: sudo bash deploy/vps-postgres-setup.sh"
  exit 1
fi

npm ci
npm run db:migrate || true
npm run build:all

NODE_BIN="$(readlink -f "$(which node)")"
setcap 'cap_net_bind_service=+ep' "$NODE_BIN" 2>/dev/null || echo "Note: use SYSLOG_UDP_PORT=5514 if cap_net_bind_service fails"

pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u "${SUDO_USER:-root}" --hp "${HOME}" || true

echo ""
echo "=== DONE ==="
echo "Marketing:    http://160.187.175.30:3000"
echo "Super Admin:  http://160.187.175.30:3001"
echo "Operator:     http://160.187.175.30:3002"
echo "API health:   http://160.187.175.30:3002/api/health"
echo "MikroTik:     remote syslog → 160.187.175.30:514"
echo "Database:     postgresql://127.0.0.1:5432/isp_logserver"
echo "Test:         npm run test:log-ingest"
echo "Full guide:   deploy/VPS-HOSTING.md"
