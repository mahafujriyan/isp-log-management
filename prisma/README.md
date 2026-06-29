# Prisma tooling + VPS PostgreSQL (Production)

**Production:** সব কিছু **VPS `160.187.175.30`-এ** — apps + PostgreSQL same server।  
`DATABASE_URL` শুধু VPS-এর `.env.production.local`-এ, **port `5432`**, host **`127.0.0.1`**।

```env
# /opt/isp-log-management/.env.production.local  (VPS-এ only)
DATABASE_URL=postgresql://isp_loguser:YOUR_PASSWORD@127.0.0.1:5432/isp_logserver
```

| Tool | কোথায় চালাবেন |
|------|----------------|
| PostgreSQL | VPS `127.0.0.1:5432` |
| PM2 apps | VPS |
| Prisma Studio | VPS-এ SSH করে (নিচে দেখুন) |
| `db:setup` / `db:migrate` | VPS-এ |

---

## VPS Production — সম্পূর্ণ flow

```bash
ssh root@160.187.175.30
cd /opt/isp-log-management

# 1) PostgreSQL install + user/database
sudo bash deploy/vps-postgres-setup.sh

# 2) Env file (VPS-এ)
cp deploy/env.vps.example .env.production.local
grep DATABASE_URL .db-credentials >> .env.production.local
# অথবা manually paste — password .db-credentials থেকে

# 3) Schema
npm run db:setup
npm run db:migrate
npm run db:sync-routers

# 4) Prisma Studio (optional — VPS-এ)
npm run db:prisma:pull
npm run db:studio    # VPS-এ চলে http://127.0.0.1:5555

# 5) Apps
npm ci && npm run build:all
npm run pm2:restart
```

### Prisma Studio browser-এ দেখতে (VPS থেকে)

VPS-এ Studio চালু করার পর **আপনার PC** থেকে শুধু Studio port forward (DB tunnel লাগে না):

```bash
# PC terminal:
ssh -L 5555:127.0.0.1:5555 root@160.187.175.30

# VPS-এ (আরেক SSH session):
cd /opt/isp-log-management && npm run db:studio

# PC browser: http://localhost:5555
```

Studio-তে logs: schema **`tenant_001`** → **`session_logs`**

---

## কোথায় logs

| Schema | Table |
|--------|-------|
| `tenant_001` | `session_logs` (primary) |
| `tenant_001` | `syslogs` |
| `public` | `tenants`, `users` |

---

## Schema update করার পর

```bash
npm run db:migrate
npm run db:prisma:pull
npm run pm2:restart
```

---

## Optional — শুধু dev (PC থেকে VPS DB debug)

Production env-এ **এটা use করবেন না**। শুধু local debug:

```bash
ssh -L 5433:127.0.0.1:5432 root@160.187.175.30
# PC .env.local only (NOT .env.production.local):
# DATABASE_URL=postgresql://...@127.0.0.1:5433/isp_logserver
```

---

## Use করবেন না

- `pooled.db.prisma.io` — Prisma hosted cloud
- `127.0.0.1:5433` — শুধু PC tunnel, production নয়
- `npm run db:prisma:start` — local prisma dev server, VPS Postgres থাকলে দরকার নেই
