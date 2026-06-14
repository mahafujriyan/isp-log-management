# VPS Deployment Guide — Cyber Link Communication

**৩টা Portal আলাদা VPS-এ host** — আগের single-port deployment guide-এর upgrade version।

| Item | Value |
|------|-------|
| **VPS IP** | `160.187.175.30` |
| **MikroTik** | `160.187.175.26` |
| **Project path** | `/opt/isp-log-management` |
| **Env file** | `.env.production.local` |

> **Related:** [ARCHITECTURE.md](../ARCHITECTURE.md) · `deploy/env.vps.example` · `deploy/domains.template.env`

---

## Deployment Map — ৩টা Section (৩টা Domain)

এক VPS, **৩টা আলাদা app** + syslog worker। Domain পরে add করবেন — আগে IP+port দিয়ে চালু করুন।

| Section | Portal | App | Port | এখন (IP) | Domain (পore লিখবেন) |
|---------|--------|-----|------|----------|---------------------|
| **SECTION 1** | Marketing | `apps/marketing` | **3000** | http://160.187.175.30:3000 | `________________________` |
| **SECTION 2** | Super Admin | `apps/super-admin` | **3001** | http://160.187.175.30:3001 | `________________________` |
| **SECTION 3** | Operator + API | `apps/operator` | **3002** | http://160.187.175.30:3002 | `________________________` |
| *(worker)* | Syslog | `workers/syslog-listener` | UDP **514** | — | — |

```
  MikroTik 160.187.175.26
         │ UDP 514
         ▼
  ┌──────────────────────────────────────────┐
  │ VPS 160.187.175.30                       │
  │                                          │
  │  SECTION 1  isp-marketing     :3000      │──► www.your-domain.com
  │  SECTION 2  isp-super-admin   :3001      │──► admin.your-domain.com
  │  SECTION 3  isp-operator      :3002      │──► app.your-domain.com
  │             isp-syslog-listener :514     │
  │                                          │
  │  nginx (domain ready হলে) → 80/443       │
  └──────────────────────────────────────────┘
```

**Domain sheet fill করতে:** `deploy/domains.template.env` → copy → `deploy/domains.env` edit করুন।

---

# PART 1 — VPS এ SSH Login

Windows PowerShell / Git Bash:

```bash
ssh root@160.187.175.30
```

---

# PART 2 — VPS এ Software Install (one-time)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx rsyslog ufw build-essential

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v    # v20.x
npm -v

sudo npm install -g pm2 tsx

sudo mkdir -p /var/log/mikrotik
sudo chown syslog:adm /var/log/mikrotik
```

---

# PART 3 — Project Upload / Clone

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/isp-log-management.git
sudo chown -R $USER:$USER /opt/isp-log-management
cd /opt/isp-log-management
```

**WinSCP / FileZilla:** Host `160.187.175.30`, Port `22`, SFTP → `/opt/isp-log-management`

---

# PART 4 — Environment File

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
nano .env.production.local
```

### Phase A — এখন (IP + Port, domain ছাড়া)

```env
NODE_ENV=production

# ── 3 Portal URLs (IP mode) ──
NEXT_PUBLIC_MARKETING_URL=http://160.187.175.30:3000
NEXT_PUBLIC_ADMIN_URL=http://160.187.175.30:3001
NEXT_PUBLIC_OPERATOR_URL=http://160.187.175.30:3002
NEXT_PUBLIC_API_URL=http://160.187.175.30:3002

AUTH_ADMIN_URL=http://160.187.175.30:3001
AUTH_OPERATOR_URL=http://160.187.175.30:3002
AUTH_URL=http://160.187.175.30:3002
NEXTAUTH_URL=http://160.187.175.30:3002
NEXT_PUBLIC_APP_URL=http://160.187.175.30:3002
NEXT_PUBLIC_SOCKET_URL=http://160.187.175.30:3002

AUTH_COOKIE_SECURE=false

MARKETING_PORT=3000
ADMIN_PORT=3001
OPERATOR_PORT=3002

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
AUTH_SECRET=PASTE_64_CHAR_HEX
NEXTAUTH_SECRET=PASTE_64_CHAR_HEX
SUPER_ADMIN_SECURITY_CODE=CYBER-LINK-2026

INGEST_SECRET=CyberLink-Ingest-2026-Secret
CRON_SECRET=CyberLink-Cron-2026-Secret
DEFAULT_TENANT_SCHEMA=tenant_001

SYSLOG_UDP_PORT=514
SOCKET_PORT=3001
SYSLOG_FILE=/var/log/mikrotik/isp-syslog.log
SYSLOG_TAIL_FILE=true
```

Secret generate:

```bash
openssl rand -hex 32
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

### Phase B — Domain ready হলে (PART 10 এর পর)

`.env.production.local` এ URLs বদলান (example):

```env
NEXT_PUBLIC_MARKETING_URL=https://www.YOUR-DOMAIN.com
NEXT_PUBLIC_ADMIN_URL=https://admin.YOUR-DOMAIN.com
NEXT_PUBLIC_OPERATOR_URL=https://app.YOUR-DOMAIN.com
NEXT_PUBLIC_API_URL=https://app.YOUR-DOMAIN.com

AUTH_ADMIN_URL=https://admin.YOUR-DOMAIN.com
AUTH_OPERATOR_URL=https://app.YOUR-DOMAIN.com
AUTH_URL=https://app.YOUR-DOMAIN.com
NEXTAUTH_URL=https://app.YOUR-DOMAIN.com
NEXT_PUBLIC_APP_URL=https://app.YOUR-DOMAIN.com
NEXT_PUBLIC_SOCKET_URL=https://app.YOUR-DOMAIN.com

AUTH_COOKIE_SECURE=true
```

তারপর: `npm run build:all && npm run pm2:restart`

---

# PART 5 — Build + Database + PM2 (সব ৩ Section একসাথে)

```bash
cd /opt/isp-log-management

npm ci
npm run build:all

npm run db:syslog
npm run db:register-sfp1

sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))

npm run pm2:start
pm2 save
pm2 startup
pm2 status
```

**Expected PM2:**

| PM2 name | Section | Port |
|----------|---------|------|
| `isp-marketing` | SECTION 1 | 3000 |
| `isp-super-admin` | SECTION 2 | 3001 |
| `isp-operator` | SECTION 3 | 3002 |
| `isp-syslog-listener` | MikroTik logs | UDP 514 |

---

# PART 6 — Firewall

### Phase A — IP + Port (এখন)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 514/udp
sudo ufw enable
sudo ufw status
```

### Phase B — Domain + nginx (পore)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 514/udp
sudo ufw enable
```

> Domain mode-এ port 3000/3001/3002 **public open করবেন না**।

---

# PART 7 — SECTION 1: Marketing Portal

| Item | Value |
|------|-------|
| App | `apps/marketing` |
| PM2 | `isp-marketing` |
| Port | **3000** |
| এখন | http://160.187.175.30:3000 |
| Domain (পore) | `www._______________` |

**কাজ:** Landing page, pricing, demo request form

**Test:**

```bash
curl -I http://127.0.0.1:3000/
```

Browser: http://160.187.175.30:3000

**Rebuild শুধু marketing:**

```bash
npm run build:marketing
npm run pm2:restart
```

---

# PART 8 — SECTION 2: Super Admin Portal

| Item | Value |
|------|-------|
| App | `apps/super-admin` |
| PM2 | `isp-super-admin` |
| Port | **3001** |
| এখন | http://160.187.175.30:3001 |
| Domain (পore) | `admin._______________` |

**কাজ:** Tenant, billing, metrics, demo approve, platform settings

**Login:**

| Email | Password | Extra |
|-------|----------|-------|
| `superadmin@cyberlink.com` | `Super@Secure2026!` | Code: `CYBER-LINK-2026` |

**Test:**

```bash
curl -I http://127.0.0.1:3001/
```

Browser: http://160.187.175.30:3001 → auto redirect `/admin/login`

> ⚠️ `160.187.175.30:3000/admin` কাজ করবে **না** — Admin শুধু **:3001**

**Rebuild শুধু admin:**

```bash
npm run build:admin
npm run pm2:restart
```

---

# PART 9 — SECTION 3: Operator Portal + API + Syslog

| Item | Value |
|------|-------|
| App | `apps/operator` |
| PM2 | `isp-operator` |
| Port | **3002** |
| এখন | http://160.187.175.30:3002 |
| Domain (পore) | `app._______________` |

**কাজ:** Operator login, logs, devices, dashboard, **সব `/api/*`**, BTRC export

**Login:**

| Email | Password |
|-------|----------|
| `admin@cyberlink.com` | `Admin@123456` |

**Important URLs (SECTION 3):**

| Service | URL (IP mode) |
|---------|---------------|
| Operator login | http://160.187.175.30:3002 |
| Full dashboard | http://160.187.175.30:3002/dashboard |
| API health | http://160.187.175.30:3002/api/health |
| Log ingest | POST http://160.187.175.30:3002/api/logs/receive |

**Test:**

```bash
curl http://127.0.0.1:3002/api/health
npm run test:log-ingest
```

**Device register (Dashboard → Devices):**

| Field | Value |
|-------|-------|
| Name | `CLC-SFP1-NAT` |
| Device IP | `160.187.175.26` |
| NAT IP | `160.187.175.26` |
| Syslog Port | `514` |

**Rebuild শুধু operator:**

```bash
npm run build:operator
npm run pm2:restart
```

---

# PART 10 — ৩টা Domain Add করা (পore, nginx)

Domain কিনলে / DNS ready হলে এই part follow করুন।

### 10.1 Domain sheet fill

```bash
cd /opt/isp-log-management
cp deploy/domains.template.env deploy/domains.env
nano deploy/domains.env
```

Example:

```env
MARKETING_DOMAIN=www.cyberlink.com
MARKETING_DOMAIN_ROOT=cyberlink.com
ADMIN_DOMAIN=admin.cyberlink.com
OPERATOR_DOMAIN=app.cyberlink.com
VPS_IP=160.187.175.30
```

### 10.2 DNS (domain registrar)

| Type | Name | Points to |
|------|------|-----------|
| A | `@` | `160.187.175.30` |
| A | `www` | `160.187.175.30` |
| A | `admin` | `160.187.175.30` |
| A | `app` | `160.187.175.30` |

Verify: `dig admin.YOUR-DOMAIN.com +short` → `160.187.175.30`

### 10.3 nginx config

**Option 1 — Ready example (cyberlink.com):**

```bash
sudo cp deploy/nginx/three-portals.conf /etc/nginx/sites-available/isp-three-portals
```

**Option 2 — Template (আপনার domain):**

```bash
cp deploy/nginx/three-portals.template.conf /tmp/isp-three-portals.conf
nano /tmp/isp-three-portals.conf
# Replace: YOUR-MARKETING-DOMAIN, YOUR-ADMIN-DOMAIN, YOUR-APP-DOMAIN
sudo cp /tmp/isp-three-portals.conf /etc/nginx/sites-available/isp-three-portals
```

Enable:

```bash
sudo ln -sf /etc/nginx/sites-available/isp-three-portals /etc/nginx/sites-enabled/isp-three-portals
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

**nginx mapping:**

| Section | Domain | → Backend |
|---------|--------|-----------|
| SECTION 1 | `www.YOUR-DOMAIN.com` | `127.0.0.1:3000` |
| SECTION 2 | `admin.YOUR-DOMAIN.com` | `127.0.0.1:3001` |
| SECTION 3 | `app.YOUR-DOMAIN.com` | `127.0.0.1:3002` |
| Socket.IO | `app.YOUR-DOMAIN.com/socket.io/` | `127.0.0.1:3001` |

### 10.4 `.env.production.local` update

PART 4 Phase B URLs set করুন → rebuild:

```bash
npm run build:all
npm run pm2:restart
```

Firewall Phase B (PART 6) apply করুন — port 3000/3001/3002 close, 80/443 open।

---

# PART 11 — SSL (HTTPS) — Domain এর পর

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d www.YOUR-DOMAIN.com \
  -d YOUR-DOMAIN.com \
  -d admin.YOUR-DOMAIN.com \
  -d app.YOUR-DOMAIN.com
```

SSL এর পর `.env`-এ `https://` URLs + `AUTH_COOKIE_SECURE=true` → `npm run build:all` → `npm run pm2:restart`

---

# PART 12 — MikroTik Config (160.187.175.26)

Winbox → **160.187.175.26**

**Import:**

1. Upload `deploy/mikrotik/clc-production.rsc`
2. Terminal: `/import file-name=clc-production.rsc`

**Manual:**

```routeros
/system logging action
add name=clc-logserver target=remote remote=160.187.175.30 remote-port=514

/system logging
add topics=ppp,info action=clc-logserver
add topics=pppoe,info action=clc-logserver
add topics=firewall,info action=clc-logserver

/ip firewall filter
add chain=forward action=log log-prefix="FWD:" comment="CLC-FWD-LOG"

/ip firewall nat
add chain=srcnat action=log log-prefix="NAT:" comment="CLC-NAT-LOG"
```

Verify: `/log print where topics~"firewall|ppp"`

---

# PART 13 — rsyslog (optional backup)

```bash
sudo cp /opt/isp-log-management/deploy/rsyslog/mikrotik.conf /etc/rsyslog.d/50-mikrotik.conf
sudo systemctl restart rsyslog
```

---

# PART 14 — Test Everything

### ৩ Section browser check

| Section | IP mode | Domain mode (পore) |
|---------|---------|---------------------|
| SECTION 1 Marketing | http://160.187.175.30:3000 | https://www.YOUR-DOMAIN.com |
| SECTION 2 Super Admin | http://160.187.175.30:3001 | https://admin.YOUR-DOMAIN.com |
| SECTION 3 Operator | http://160.187.175.30:3002 | https://app.YOUR-DOMAIN.com |
| API health | http://160.187.175.30:3002/api/health | https://app.YOUR-DOMAIN.com/api/health |

### VPS terminal

```bash
cd /opt/isp-log-management
npm run test:log-ingest
pm2 status
```

Manual log test:

```bash
curl -X POST http://160.187.175.30:3002/api/logs/receive \
  -H "Content-Type: text/plain" \
  -H "x-ingest-secret: CyberLink-Ingest-2026-Secret" \
  -H "x-router-ip: 160.187.175.26" \
  -d "<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info pppoe_user=test@clc mac_address=48:A9:8A:C2:28:BF user_ip=10.121.124.50 nat_ip=160.187.175.26 src-address=10.121.124.50:51234 dst-address=8.8.8.8:53 protocol=udp"
```

Dashboard → **Logs** → Range: **Last 7 days** → Badge: **Live**

---

# PART 15 — Update / Redeploy

```bash
cd /opt/isp-log-management
git pull
npm ci
npm run build:all
npm run pm2:restart
pm2 status
```

---

# Troubleshooting

| সমস্যা | সমাধান |
|--------|---------|
| `:3000/admin` 404 | Admin = **SECTION 2** → port **3001** |
| `:3001` বা `:3002` 404 | latest code + `npm run build:all` + restart |
| Login হয়, logout নয় | IP mode: `AUTH_COOKIE_SECURE=false` |
| Site open হয় না | `pm2 status` + `sudo systemctl status nginx` |
| MikroTik log নেই | `ufw allow 514/udp` + router remote syslog |
| nginx 502 | `pm2 logs isp-operator` |
| Domain কাজ করে না | DNS A record → `160.187.175.30` |

```bash
pm2 logs isp-marketing --lines 30
pm2 logs isp-super-admin --lines 30
pm2 logs isp-operator --lines 30
pm2 logs isp-syslog-listener --lines 30
```

---

# Quick Reference Card

```
VPS IP:           160.187.175.30
MikroTik IP:      160.187.175.26
Project:          /opt/isp-log-management
Env:              .env.production.local
Domain sheet:     deploy/domains.env

SECTION 1 (Marketing):   :3000  →  www.YOUR-DOMAIN.com
SECTION 2 (Super Admin):   :3001  →  admin.YOUR-DOMAIN.com
SECTION 3 (Operator+API):  :3002  →  app.YOUR-DOMAIN.com
Syslog:                    UDP 514 → 160.187.175.30

Build:            npm run build:all
PM2:              npm run pm2:start | pm2:restart
Test:             npm run test:log-ingest
```

---

## Deploy files index

| File | কাজ |
|------|-----|
| `deploy/VPS-HOSTING.md` | **এই guide** (main) |
| `deploy/domains.template.env` | ৩ domain fill-in sheet |
| `deploy/env.vps.example` | `.env.production.local` template |
| `deploy/ecosystem.config.cjs` | PM2 — 4 process |
| `deploy/nginx/three-portals.conf` | nginx (cyberlink example) |
| `deploy/nginx/three-portals.template.conf` | nginx (your domain) |
| `deploy/mikrotik/clc-production.rsc` | MikroTik syslog |
| `deploy/VPS-3-PORTAL-HOSTING.md` | Short summary (→ এই file) |

---

**পুরনো single-port guide (`:3000` only) obsolete** — এখন ৩ Section আলাদা। Migrate: env update → `build:all` → PM2 restart → firewall/nginx update।
