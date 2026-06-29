# Deploy — Index

**Main VPS guide (current):** **[VPS-HOSTING.md](./VPS-HOSTING.md)**

## Architecture (June 2026)

| Component | Where |
|-----------|--------|
| Apps (3 portals + syslog) | VPS `160.187.175.30` |
| PostgreSQL | **Prisma cloud** (`pooled.db.prisma.io`) — not on VPS |
| MikroTik syslog source | `160.187.175.26` → VPS UDP `514` |

## Quick start (VPS)

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local   # edit DATABASE_URL + secrets
npm ci && npm run db:migrate && npm run build:all
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
npm run pm2:start && pm2 save
```

## Docs

| Doc | When to use |
|-----|-------------|
| [VPS-HOSTING.md](./VPS-HOSTING.md) | Full deploy — first time + domain + SSL |
| [VPS-3-PORTAL-HOSTING.md](./VPS-3-PORTAL-HOSTING.md) | One-page summary |
| [VPS-PM2-MIGRATE.md](./VPS-PM2-MIGRATE.md) | পুরনো `isp-logserver` PM2 থেকে migrate |
| [VPS-MONOREPO-UPDATE.md](./VPS-MONOREPO-UPDATE.md) | Git pull update only |
| [mikrotik/README.md](./mikrotik/README.md) | Router syslog config |

## Ports

| Service | Port |
|---------|------|
| Marketing | 3000 |
| Super Admin | 3001 |
| Operator + API | 3002 |
| Socket.IO (syslog worker) | **3003** |
| MikroTik syslog | UDP **514** |
