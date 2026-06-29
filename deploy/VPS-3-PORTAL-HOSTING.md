# VPS — 3 Portal Hosting (Summary)

> **Full guide:** **[VPS-HOSTING.md](./VPS-HOSTING.md)** · Index: [README.md](./README.md)

## Current setup

| | |
|--|--|
| VPS | `160.187.175.30` — apps + syslog only |
| Database | **Prisma Postgres** (`pooled.db.prisma.io`) — cloud |
| MikroTik | `160.187.175.26` → UDP `514` |
| Data | Production only — no demo sandbox |

## ৩ Section

| Section | Portal | Port | URL |
|---------|--------|------|-----|
| 1 | Marketing | 3000 | http://160.187.175.30:3000 |
| 2 | Super Admin | 3001 | http://160.187.175.30:3001 |
| 3 | Operator + API | 3002 | http://160.187.175.30:3002 |
| — | Socket.IO | **3003** | (syslog worker) |

## Quick deploy

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
# edit: DATABASE_URL (Prisma), AUTH_SECRET, INGEST_SECRET

npm ci
npm run db:migrate          # Prisma cloud DB
npm run build:all
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
npm run pm2:start && pm2 save

sudo ufw allow 3000/tcp && sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp && sudo ufw allow 3003/tcp
sudo ufw allow 514/udp && sudo ufw enable
```

## Domain (পরে)

1. `deploy/domains.template.env` → `deploy/domains.env`
2. DNS A → `160.187.175.30`
3. `deploy/nginx/three-portals.conf`
4. `.env` → https URLs + `AUTH_COOKIE_SECURE=true`
5. `certbot` → `npm run build:all && npm run pm2:restart`

**Details:** [VPS-HOSTING.md](./VPS-HOSTING.md) PART 11–12
