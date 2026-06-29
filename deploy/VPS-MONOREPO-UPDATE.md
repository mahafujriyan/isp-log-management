# VPS Update — Monorepo (3 Portals + Prisma DB)

> **Full guide:** [VPS-HOSTING.md](./VPS-HOSTING.md)

VPS: **160.187.175.30** · DB: **Prisma cloud** (not on VPS)

## URLs

| Portal | URL |
|--------|-----|
| Marketing | http://160.187.175.30:3000 |
| Super Admin | http://160.187.175.30:3001/admin/login |
| Operator | http://160.187.175.30:3002/auth/login |

## SSH update

```bash
cd /opt/isp-log-management
git pull
npm ci
npm run db:migrate
npm run build:all
npm run pm2:restart
npm run db:sync-routers
pm2 status
```

## Env minimum (`.env.production.local`)

```env
NEXT_PUBLIC_MARKETING_URL=http://160.187.175.30:3000
NEXT_PUBLIC_ADMIN_URL=http://160.187.175.30:3001
NEXT_PUBLIC_OPERATOR_URL=http://160.187.175.30:3002
NEXT_PUBLIC_API_URL=http://160.187.175.30:3002
NEXT_PUBLIC_SOCKET_URL=http://160.187.175.30:3003
AUTH_COOKIE_SECURE=false

DATABASE_URL=postgres://...@pooled.db.prisma.io:5432/postgres?sslmode=require
DATABASE_POOL_MAX=3
AUTH_SECRET=...
SOCKET_PORT=3003
```

## Notes

- Database = Prisma hosted — VPS-এ Postgres install লাগে না
- Admin portal = port **3001** only
- Socket.IO = port **3003** (not 3001)
- No demo data — `npm run db:purge-demo` if old sandbox exists
