# VPS Deployment — Cyber Link Communication (Current)

**Last updated:** June 2026 · Monorepo 3-portal + **VPS PostgreSQL** (recommended)

| Role | IP / Host |
|------|-----------|
| **Log VPS** (apps + syslog + **database**) | `160.187.175.30` |
| **MikroTik NAT** (CLC-SFP1-NAT) | `160.187.175.26` |
| **Database** | **PostgreSQL on VPS** `127.0.0.1:5432` / `isp_logserver` |
| **Project path** | `/opt/isp-log-management` |
| **Env file** | `.env.production.local` |

> **Database guide:** [VPS-POSTGRES.md](./VPS-POSTGRES.md) — Prisma cloud-এর বদলে VPS Postgres setup

---

## Current situation (কী চলছে এখন)

```
  MikroTik 160.187.175.26
         │ UDP syslog :514
         ▼
  ┌─────────────────────────────────────────────────────┐
  │ VPS 160.187.175.30                                  │
  │                                                     │
  │  PostgreSQL :5432 (127.0.0.1)  isp_logserver        │
  │       └── tenant_001.syslogs / session_logs         │
  │                                                     │
  │  isp-marketing      → :3000                         │
  │  isp-super-admin    → :3001                         │
  │  isp-operator       → :3002   Operator + API        │
  │  isp-syslog-listener→ UDP 514 + Socket.IO :3003     │
  │  nginx (optional)   → 80/443                        │
  └─────────────────────────────────────────────────────┘
```

| Item | Status |
|------|--------|
| Database | **PostgreSQL on same VPS** — no Prisma cloud, no plan limit |
| Data | **Real production only** — no demo sandbox |
| Tenant | `tenant_001` — Cyber Link Communication |
| Router | `CLC-SFP1-NAT` @ `160.187.175.26` |
| Dashboard storage | `pg_database_size()` from local Postgres |

**Related docs:** [ARCHITECTURE.md](../ARCHITECTURE.md) · [database/README.md](../database/README.md) · [deploy/mikrotik/README.md](./mikrotik/README.md)

---

## Portal map

| Section | Portal | App folder | Port | URL (IP mode) |
|---------|--------|------------|------|---------------|
| 1 | Marketing | `apps/marketing` | **3000** | http://160.187.175.30:3000 |
| 2 | Super Admin | `apps/super-admin` | **3001** | http://160.187.175.30:3001 |
| 3 | Operator + API | `apps/operator` | **3002** | http://160.187.175.30:3002 |
| — | Syslog worker | `workers/syslog-listener` | UDP **514** + Socket **3003** | — |

> ⚠️ `160.187.175.30:3000/admin` কাজ করবে **না** — Admin শুধু **:3001**  
> ⚠️ Socket.IO port **3003** (3001 = Super Admin — clash হবে)

---

## Logins (production)

| Portal | Email | Password | Extra |
|--------|-------|----------|-------|
| Operator (:3002) | `admin@cyberlink.com` | `Admin@123456` | — |
| Super Admin (:3001) | `superadmin@cyberlink.com` | `Super@Secure2026!` | Code: `CYBER-LINK-2026` |

---

# PART 1 — VPS SSH

```bash
ssh root@160.187.175.30
```

---

# PART 2 — One-time software (VPS)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx rsyslog ufw build-essential postgresql postgresql-contrib

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v    # v20.x
npm -v

sudo npm install -g pm2 tsx

sudo mkdir -p /var/log/mikrotik
sudo chown syslog:adm /var/log/mikrotik
```

---

# PART 2b — PostgreSQL on VPS (database)

```bash
cd /opt/isp-log-management
sudo bash deploy/vps-postgres-setup.sh
```

Creates `isp_logserver` + user `isp_loguser`. Password → `.db-credentials`

Full details: **[VPS-POSTGRES.md](./VPS-POSTGRES.md)**

---

# PART 3 — Clone project

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/isp-log-management.git
sudo chown -R $USER:$USER /opt/isp-log-management
cd /opt/isp-log-management
```

WinSCP / SFTP → `/opt/isp-log-management`

---

# PART 4 — Environment (`.env.production.local`)

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
nano .env.production.local
```

### Required values

```env
NODE_ENV=production

# ── 3 Portal URLs (IP mode — domain না থাকলে) ──
NEXT_PUBLIC_MARKETING_URL=http://160.187.175.30:3000
NEXT_PUBLIC_ADMIN_URL=http://160.187.175.30:3001
NEXT_PUBLIC_OPERATOR_URL=http://160.187.175.30:3002
NEXT_PUBLIC_API_URL=http://160.187.175.30:3002
NEXT_PUBLIC_APP_URL=http://160.187.175.30:3002

AUTH_ADMIN_URL=http://160.187.175.30:3001
AUTH_OPERATOR_URL=http://160.187.175.30:3002
AUTH_URL=http://160.187.175.30:3002
NEXTAUTH_URL=http://160.187.175.30:3002
NEXT_PUBLIC_SOCKET_URL=http://160.187.175.30:3003

AUTH_COOKIE_SECURE=false

MARKETING_PORT=3000
ADMIN_PORT=3001
OPERATOR_PORT=3002

# ── VPS local PostgreSQL (127.0.0.1 — same server) ──
# Copy from .db-credentials after: sudo bash deploy/vps-postgres-setup.sh
DATABASE_URL=postgresql://isp_loguser:YOUR_PASSWORD@127.0.0.1:5432/isp_logserver
DATABASE_POOL_MAX=10
DATABASE_STORAGE_LIMIT_GB=50

AUTH_SECRET=PASTE_64_CHAR_HEX
NEXTAUTH_SECRET=PASTE_64_CHAR_HEX
SUPER_ADMIN_SECURITY_CODE=CYBER-LINK-2026

INGEST_SECRET=CyberLink-Ingest-2026-Secret
CRON_SECRET=CyberLink-Cron-2026-Secret
DEFAULT_TENANT_SCHEMA=tenant_001

SYSLOG_UDP_PORT=514
SOCKET_PORT=3003
SYSLOG_FILE=/var/log/mikrotik/isp-syslog.log
SYSLOG_TAIL_FILE=true
```

Secret generate:

```bash
openssl rand -hex 32
```

**`DATABASE_URL`:** `deploy/vps-postgres-setup.sh` run করার পর `.db-credentials` file থেকে copy করুন।

---

# PART 5 — Database (VPS PostgreSQL)

```bash
cd /opt/isp-log-management

# Fresh database (schema + production seeds)
npm run db:setup

# Versioned patches (every deploy)
npm run db:migrate

npm run db:sync-routers
```

| Command | কখন |
|---------|------|
| `npm run db:setup` | প্রথমবার নতুন Prisma DB |
| `npm run db:migrate` | **প্রতি deploy** — pending migrations apply |
| `npm run db:sync-routers` | device/router table update এর পর |
| `npm run db:purge-demo` | পুরনো demo data থাকলে একবার clean |

> Local dev: root `.env.local` — VPS: `.env.production.local` (PM2 `load-env.cjs` পড়ে)

---

# PART 6 — Build + PM2

```bash
cd /opt/isp-log-management

npm ci
npm run build:all

# UDP 514 bind (privileged port)
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))

npm run pm2:start
pm2 save
pm2 startup
pm2 status
```

**Expected PM2:**

| PM2 name | Port | Role |
|----------|------|------|
| `isp-marketing` | 3000 | Marketing |
| `isp-super-admin` | 3001 | Super Admin |
| `isp-operator` | 3002 | Operator + `/api/*` |
| `isp-syslog-listener` | UDP 514, Socket **3003** | MikroTik ingest |

```bash
pm2 logs isp-operator --lines 30
pm2 logs isp-syslog-listener --lines 30
```

---

# PART 7 — Firewall

### Phase A — IP + port (এখন)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 3003/tcp
sudo ufw allow 514/udp
sudo ufw enable
sudo ufw status
```

### Phase B — Domain + nginx

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 514/udp
sudo ufw enable
```

Domain mode-এ **3000/3001/3002 public open করবেন না** — nginx দিয়ে 80/443 proxy।

---

# PART 8 — SECTION 1: Marketing (:3000)

```bash
curl -I http://127.0.0.1:3000/
```

Browser: http://160.187.175.30:3000

Rebuild:

```bash
npm run build:marketing && npm run pm2:restart
```

---

# PART 9 — SECTION 2: Super Admin (:3001)

```bash
curl -I http://127.0.0.1:3001/
```

Browser: http://160.187.175.30:3001 → `/admin/login`

Rebuild:

```bash
npm run build:admin && npm run pm2:restart
```

---

# PART 10 — SECTION 3: Operator + API + Syslog (:3002)

| Service | URL |
|---------|-----|
| Login | http://160.187.175.30:3002 |
| Dashboard | http://160.187.175.30:3002/dashboard |
| API health | http://160.187.175.30:3002/api/health |
| Log ingest | POST http://160.187.175.30:3002/api/logs/receive |

```bash
curl http://127.0.0.1:3002/api/health
npm run test:log-ingest
```

**Registered device (production):**

| Field | Value |
|-------|-------|
| Name | `CLC-SFP1-NAT` |
| Device IP | `160.187.175.26` |
| NAT IP | `160.187.175.26` |
| Syslog Port | `514` |

Rebuild:

```bash
npm run build:operator && npm run pm2:restart
```

---

# PART 11 — Domain + nginx (optional)

```bash
cd /opt/isp-log-management
cp deploy/domains.template.env deploy/domains.env
nano deploy/domains.env
```

DNS A records → `160.187.175.30` (`www`, `admin`, `app`)

```bash
sudo cp deploy/nginx/three-portals.conf /etc/nginx/sites-available/isp-three-portals
# অথবা template: deploy/nginx/three-portals.template.conf

sudo ln -sf /etc/nginx/sites-available/isp-three-portals /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

| Domain | → Backend |
|--------|-----------|
| `www.*` | `127.0.0.1:3000` |
| `admin.*` | `127.0.0.1:3001` |
| `app.*` | `127.0.0.1:3002` |
| `app.*/socket.io/` | `127.0.0.1:3003` |

`.env` → https URLs → `npm run build:all` → `npm run pm2:restart`

---

# PART 12 — SSL (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d www.YOUR-DOMAIN.com \
  -d YOUR-DOMAIN.com \
  -d admin.YOUR-DOMAIN.com \
  -d app.YOUR-DOMAIN.com
```

SSL পর `AUTH_COOKIE_SECURE=true` + https URLs → rebuild + restart

---

# PART 13 — MikroTik (160.187.175.26)

Winbox → Files → upload `deploy/mikrotik/clc-production.rsc` → Terminal:

```routeros
/import file-name=clc-production.rsc
```

Syslog target: `160.187.175.30:514`

Verify: `/log print where topics~"firewall|ppp"`

Full details: [deploy/mikrotik/README.md](./mikrotik/README.md)

---

# PART 14 — rsyslog backup (optional)

```bash
sudo cp /opt/isp-log-management/deploy/rsyslog/mikrotik.conf /etc/rsyslog.d/50-mikrotik.conf
sudo systemctl restart rsyslog
```

---

# PART 15 — Test checklist

| Check | Command / URL |
|-------|----------------|
| Marketing | http://160.187.175.30:3000 |
| Super Admin login | http://160.187.175.30:3001 |
| Operator login | http://160.187.175.30:3002 |
| API health | `curl http://127.0.0.1:3002/api/health` |
| DB connection | `npm run db:migrate` (no error) |
| Log ingest | `npm run test:log-ingest` |
| PM2 all online | `pm2 status` |
| Dashboard storage | Operator → Dashboard → **DB storage** card (Prisma real size) |
| Live logs | Dashboard → Logs → Last 7 days |

Manual ingest test:

```bash
curl -X POST http://160.187.175.30:3002/api/logs/receive \
  -H "Content-Type: text/plain" \
  -H "x-ingest-secret: YOUR_INGEST_SECRET" \
  -H "x-router-ip: 160.187.175.26" \
  -d "<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info pppoe_user=test@clc mac_address=48:A9:8A:C2:28:BF user_ip=10.121.124.50 nat_ip=160.187.175.26 src-address=10.121.124.50:51234 dst-address=8.8.8.8:53 protocol=udp"
```

---

# PART 16 — Update / redeploy

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

---

# Troubleshooting

| সমস্যা | সমাধান |
|--------|---------|
| `DATABASE_URL` / connection error | `sudo systemctl status postgresql` · URL = `127.0.0.1:5432/isp_logserver` · check `.db-credentials` |
| Prisma plan limit (old setup) | Switch to VPS Postgres — [VPS-POSTGRES.md](./VPS-POSTGRES.md) |
| `isp-syslog-listener errored` | `SOCKET_PORT=3003` (3001 নয়); `pm2 restart isp-syslog-listener` |
| Login হয়, logout হয় না | IP mode: `AUTH_COOKIE_SECURE=false` |
| `:3000/admin` 404 | Admin = **:3001** |
| Log ingest not working | 1) URL must be `/api/logs/receive` (full word) 2) Header `x-ingest-secret` = `INGEST_SECRET` from `.env.production.local` 3) Header `Content-Type: text/plain` 4) `GET /api/logs/receive` for diagnostics 5) MikroTik uses **UDP 514** → `isp-syslog-listener` (not HTTP) |
| Ingest 403 Forbidden | `INGEST_SECRET` missing or header mismatch — `npm run test:vps-ingest` on VPS |
| Ingest 400 Unknown router | `npm run db:sync-routers` + header `x-router-ip: 160.187.175.26` |
| Site not reachable | `pm2 status` + `ufw allow 3002/tcp` |
| nginx 502 | `pm2 logs isp-operator` |
| Demo/fake logs দেখায় | `npm run db:purge-demo` + app rebuild |
| Dashboard storage `—` | `DATABASE_URL` ঠিক আছে কিনা; `PRISMA_PLAN` / `DATABASE_STORAGE_LIMIT_MB` set করুন |
| Auth 404 on operator | latest code pull; `apps/operator/src/proxy.ts` exists; `npm run build:operator` |

```bash
pm2 logs isp-marketing --lines 30
pm2 logs isp-super-admin --lines 30
pm2 logs isp-operator --lines 30
pm2 logs isp-syslog-listener --lines 30
sudo tail -30 /var/log/nginx/error.log
```

---

# Quick reference

```
VPS:              160.187.175.30
MikroTik:         160.187.175.26
Database:         PostgreSQL @ 127.0.0.1:5432/isp_logserver (on VPS)
Project:          /opt/isp-log-management
Env:              .env.production.local

Marketing:        :3000
Super Admin:      :3001
Operator + API:   :3002
Syslog UDP:       :514
Socket.IO:        :3003

Build:            npm run build:all
DB:               npm run db:migrate
PM2:              npm run pm2:start | pm2:restart
Test:             npm run test:log-ingest
```

---

## Deploy files index

| File | Purpose |
|------|---------|
| **deploy/VPS-HOSTING.md** | এই guide (main) |
| **deploy/VPS-POSTGRES.md** | VPS PostgreSQL setup |
| deploy/VPS-3-PORTAL-HOSTING.md | Short summary |
| deploy/VPS-PM2-MIGRATE.md | পুরনো single-app PM2 → monorepo |
| deploy/env.vps.example | `.env.production.local` template |
| deploy/ecosystem.config.cjs | PM2 — 4 processes |
| deploy/nginx/three-portals.conf | nginx 3 domains + socket :3003 |
| deploy/mikrotik/clc-production.rsc | MikroTik production syslog |
| deploy/domains.template.env | Domain fill-in sheet |
