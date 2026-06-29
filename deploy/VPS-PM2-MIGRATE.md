# VPS — পুরনো PM2 থেকে Monorepo (৩ Portal)

> **Full guide:** [VPS-HOSTING.md](./VPS-HOSTING.md)

`isp-logserver` (পুরনো single-app) চললে নতুন monorepo ঠিকমতো কাজ করবে না।

---

## চিনবেন

| লক্ষণ | মানে |
|--------|------|
| `pm2 show isp-logserver` | পুরনো PM2 — delete করুন |
| `.env` নেই, login fail | `.env.production.local` লাগবে |
| `isp-syslog-listener errored` | `SOCKET_PORT=3003` (3001 নয়) |
| DB connection error | Prisma pooled URL + `sslmode=require` |

---

## Step 1 — Env

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
nano .env.production.local
```

**Fill:** `DATABASE_URL` (Prisma `pooled.db.prisma.io`), `AUTH_SECRET`, `INGEST_SECRET`, `SOCKET_PORT=3003`

---

## Step 2 — Database (Prisma cloud)

```bash
npm run db:migrate
npm run db:sync-routers
```

প্রথমবার fresh DB: `npm run db:setup` (production seeds — no demo)

---

## Step 3 — Build

```bash
npm ci
npm run build:all
```

৩টা app সব `✓` হতে হবে।

---

## Step 4 — PM2 switch

```bash
pm2 delete isp-logserver 2>/dev/null || true
pm2 delete all 2>/dev/null || true

sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
npm run pm2:start
pm2 save
pm2 status
```

| name | port |
|------|------|
| isp-marketing | 3000 |
| isp-super-admin | 3001 |
| isp-operator | 3002 |
| isp-syslog-listener | UDP 514 + socket **3003** |

---

## Step 5 — Verify

```bash
sudo ss -tlnp | grep -E '3000|3001|3002|3003'
curl -s http://127.0.0.1:3002/api/health
npm run test:log-ingest
```

## URLs

| Portal | URL |
|--------|-----|
| Marketing | http://160.187.175.30:3000 |
| Super Admin | http://160.187.175.30:3001 |
| Operator | http://160.187.175.30:3002 |

> `:3000/admin` কাজ করবে না — Admin = **:3001**

---

## Debug

```bash
pm2 logs isp-operator --lines 50
pm2 logs isp-syslog-listener --lines 30
```
