# VPS PostgreSQL — Database on same server (recommended)

Prisma cloud-এর বদলে **160.187.175.30 VPS-এর ভিতরে PostgreSQL** — no plan limit, full control, logs সব local।

## Architecture

```
VPS 160.187.175.30
├── PostgreSQL :5432 (127.0.0.1 only)
│   └── isp_logserver
│       ├── public.*          (tenants, users, plans)
│       └── tenant_001.*      (syslogs, devices, routers)
├── isp-operator :3002
├── isp-syslog-listener :514
└── ...
```

## Step 1 — Install PostgreSQL (one-time)

SSH to VPS:

```bash
cd /opt/isp-log-management
sudo bash deploy/vps-postgres-setup.sh
```

এটা করবে:
- `postgresql` install
- Database: `isp_logserver`
- User: `isp_loguser`
- Password auto-generate → `.db-credentials` file

## Step 2 — `.env.production.local`

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local

# Copy DATABASE_URL from generated credentials:
grep DATABASE_URL .db-credentials
nano .env.production.local   # paste DATABASE_URL line
```

Example:

```env
DATABASE_URL=postgresql://isp_loguser:YOUR_PASSWORD@127.0.0.1:5432/isp_logserver
DATABASE_POOL_MAX=10
DATABASE_STORAGE_LIMIT_GB=50
```

> **127.0.0.1** — শুধু same VPS থেকে connect (secure). বাইরে থেকে DB port open করবেন না।

## Step 3 — Schema + seeds

```bash
npm run db:setup
npm run db:migrate
npm run db:sync-routers
```

## Step 4 — Build + PM2

```bash
npm ci
npm run build:all
npm run pm2:restart
```

## Step 5 — Verify

```bash
curl http://127.0.0.1:3002/api/health
npm run test:log-ingest
sudo -u postgres psql -d isp_logserver -c "SELECT COUNT(*) FROM tenant_001.syslogs;"
```

Dashboard → Log Stream → **All time**

---

## Prisma Studio (VPS-এ — production)

```bash
cd /opt/isp-log-management
npm run db:prisma:pull
npm run db:studio         # VPS-এ http://127.0.0.1:5555
```

PC browser থেকে দেখতে (শুধু Studio port — **DB URL change করবেন না**):

```bash
ssh -L 5555:127.0.0.1:5555 root@160.187.175.30
# VPS-এ npm run db:studio চালু রাখুন → PC browser: http://localhost:5555
```

`.env.production.local` সবসময় **`127.0.0.1:5432`** — port 5433 শুধু optional PC debug।

Full guide: [prisma/README.md](../prisma/README.md)

---

## Prisma cloud থেকে migrate (optional)

যদি আগে Prisma-তে data থাকে এবং plan limit hit হয়েছে:

1. Prisma Console → Studio → `tenant_001` tables export (যদি access থাকে)
2. অথবা fresh start: `npm run db:setup` on VPS — নতুন empty DB
3. MikroTik থেকে নতুন logs আবার ingest হবে automatically

Fresh start সবচেয়ে সহজ — পুরনো Prisma data ছাড়াই production চালু।

---

## Backup (daily)

```bash
sudo -u postgres pg_dump isp_logserver | gzip > /var/backups/isp_logserver-$(date +%F).sql.gz
```

Cron example:

```bash
0 3 * * * sudo -u postgres pg_dump isp_logserver | gzip > /var/backups/isp_logserver-$(date +\%F).sql.gz
```

---

## Troubleshooting

| সমস্যা | সমাধান |
|--------|---------|
| `connection refused` | `sudo systemctl status postgresql` |
| `password authentication failed` | `.db-credentials` থেকে সঠিক URL copy করুন |
| `database does not exist` | `sudo bash deploy/vps-postgres-setup.sh` আবার run |
| Dashboard empty | `npm run db:migrate` + Log Stream → **All time** |
| Prisma plan limit | VPS Postgres use করলে আর Prisma লাগে না |

---

## Local dev (PC only — production নয়)

PC-তে dev করলে আলাদা `.env.local` — **`.env.production.local` VPS-এই থাকবে**।

```env
# PC .env.local only
DATABASE_URL=postgresql://isp_loguser:password@localhost:5432/isp_logserver
```
