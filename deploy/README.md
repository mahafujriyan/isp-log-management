# Deploy — Index

**Main VPS guide:** **[VPS-HOSTING.md](./VPS-HOSTING.md)**  
**Database on VPS:** **[VPS-POSTGRES.md](./VPS-POSTGRES.md)** ← recommended

## Architecture (June 2026)

| Component | Where |
|-----------|--------|
| Apps (3 portals + syslog) | VPS `160.187.175.30` |
| PostgreSQL | **Same VPS** `127.0.0.1:5432` / `isp_logserver` |
| MikroTik syslog source | `160.187.175.26` → VPS UDP `514` |

## Quick start (VPS)

```bash
cd /opt/isp-log-management
sudo bash deploy/vps-postgres-setup.sh          # PostgreSQL + database
cp deploy/env.vps.example .env.production.local # paste DATABASE_URL from .db-credentials
npm run db:setup && npm run db:migrate
npm ci && npm run build:all
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
npm run pm2:start && pm2 save
```

## Docs

| Doc | When to use |
|-----|-------------|
| [prisma/README.md](../prisma/README.md) | **Prisma Studio** + VPS PostgreSQL |
| [VPS-HOSTING.md](./VPS-HOSTING.md) | Full deploy — portals + domain + SSL |
| [VPS-3-PORTAL-HOSTING.md](./VPS-3-PORTAL-HOSTING.md) | One-page summary |
| [VPS-PM2-MIGRATE.md](./VPS-PM2-MIGRATE.md) | পুরনো PM2 → monorepo |
| [mikrotik/README.md](./mikrotik/README.md) | Router syslog |

## Ports

| Service | Port |
|---------|------|
| PostgreSQL | 5432 (localhost only) |
| Marketing | 3000 |
| Super Admin | 3001 |
| Operator + API | 3002 |
| Socket.IO | **3003** |
| MikroTik syslog | UDP **514** |
