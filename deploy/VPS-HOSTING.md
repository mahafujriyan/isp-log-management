# VPS Hosting Guide — Cyber Link Communication

সম্পূর্ণ step-by-step: **VPS `160.187.175.30`** এ ISP Log Management host করা।

---

## আপনার Network Map

| জিনিস | IP / Value |
|--------|------------|
| **VPS (Log Server + Website)** | `160.187.175.30` |
| **MikroTik Router (SFP1 WAN)** | `160.187.175.26` |
| **MikroTik Gateway** | `10.121.124.1` |
| **MikroTik MAC** | `48:A9:8A:C2:28:BF` |
| **Dashboard URL** | http://160.187.175.30 |
| **Syslog Port** | UDP `514` |
| **Tenant** | `tenant_001` |

---

# PART 1 — VPS এ SSH Login

Windows PowerShell বা Git Bash:

```bash
ssh root@160.187.175.30
```

অথবা non-root user:

```bash
ssh youruser@160.187.175.30
```

---

# PART 2 — VPS এ Software Install

VPS terminal-এ এক এক করে copy-paste করুন:

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Required packages
sudo apt install -y curl git nginx rsyslog ufw build-essential

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v    # v20.x
npm -v

# PM2 + tsx (global)
sudo npm install -g pm2 tsx

# MikroTik log folder
sudo mkdir -p /var/log/mikrotik
sudo chown syslog:adm /var/log/mikrotik
```

---

# PART 3 — Project Upload / Clone

### Option A — Git clone (recommended)

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/isp-log-management.git
sudo chown -R $USER:$USER /opt/isp-log-management
cd /opt/isp-log-management
```

### Option B — Local PC থেকে upload (WinSCP / FileZilla)

| Field | Value |
|-------|-------|
| Host | `160.187.175.30` |
| Port | `22` |
| Protocol | SFTP |
| Remote folder | `/opt/isp-log-management` |

পুরো project folder upload করুন।

---

# PART 4 — Environment File (সব input)

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
nano .env.production.local
```

**নিচেরটা paste করুন — শুধু `DATABASE_URL`, `AUTH_SECRET`, `INGEST_SECRET` বদলান:**

```env
NODE_ENV=production

NEXT_PUBLIC_APP_URL=http://160.187.175.30
AUTH_URL=http://160.187.175.30
NEXTAUTH_URL=http://160.187.175.30
NEXT_PUBLIC_SOCKET_URL=http://160.187.175.30

# Supabase — আপনার local .env.local থেকে DATABASE_URL copy করুন
DATABASE_URL=postgresql://postgres.ffxzitmejrgbaxtqlflc:YOUR_PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require

# Generate: openssl rand -hex 32
AUTH_SECRET=paste-64-char-hex-here
NEXTAUTH_SECRET=paste-same-or-new-64-char-hex-here

SUPER_ADMIN_SECURITY_CODE=CYBER-LINK-2026

INGEST_SECRET=CyberLink-Ingest-2026-Secret
CRON_SECRET=CyberLink-Cron-2026-Secret
DEFAULT_TENANT_SCHEMA=tenant_001

SYSLOG_UDP_PORT=514
SOCKET_PORT=3001
SYSLOG_FILE=/var/log/mikrotik/isp-syslog.log
SYSLOG_TAIL_FILE=true
PORT=3000

IMGBB_API_KEY=96c2c706cf689389d2b55a12d2f5ab39

BTRC_ISP_LICENSE=ISP-BD-CYBER-2024
BTRC_ISP_NAME=Cyber Link Communication
BTRC_CONTACT_EMAIL=admin@cyberlink.com
```

### Secret generate (VPS-এ run করুন):

```bash
openssl rand -hex 32
# output copy → AUTH_SECRET ও NEXTAUTH_SECRET এ paste
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

---

# PART 5 — Build + Database + Start

```bash
cd /opt/isp-log-management

npm ci
npm run build

# Database tables + router register
npm run db:syslog
npm run db:register-sfp1

# UDP 514 bind permission (important!)
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))

# Start both services
npm run pm2:start
pm2 save
pm2 startup
# ↑ last command যেটা print করবে সেটা copy-paste করুন

pm2 status
```

**Expected PM2 output:**

| name | status |
|------|--------|
| isp-logserver | online |
| isp-syslog-listener | online |

---

# PART 6 — Nginx Setup

```bash
cd /opt/isp-log-management

sudo cp deploy/nginx/logserver.conf /etc/nginx/sites-available/isp-logserver
sudo ln -sf /etc/nginx/sites-available/isp-logserver /etc/nginx/sites-enabled/isp-logserver
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

# PART 7 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 514/udp
sudo ufw enable
sudo ufw status
```

---

# PART 8 — rsyslog (optional backup log file)

```bash
sudo cp /opt/isp-log-management/deploy/rsyslog/mikrotik.conf /etc/rsyslog.d/50-mikrotik.conf
sudo systemctl restart rsyslog
```

---

# PART 9 — MikroTik Config (160.187.175.26)

Winbox → **160.187.175.26** connect করুন।

### Method 1 — Import file

1. Files → Upload `deploy/mikrotik/clc-production.rsc`
2. Terminal:

```
/import file-name=clc-production.rsc
```

### Method 2 — Manual paste (Terminal)

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

Verify:

```routeros
/log print where topics~"firewall|ppp"
```

---

# PART 10 — Dashboard Device Register

Browser: **http://160.187.175.30**

Login:
- Email: `admin@cyberlink.com`
- Password: `Admin@123456`

**Devices** → Add (যদি না থাকে):

| Field | Input |
|-------|-------|
| Name | `CLC-SFP1-NAT` |
| Device IP | `160.187.175.26` |
| NAT IP | `160.187.175.26` |
| Config | `NAT` |
| Syslog Port | `514` |

---

# PART 11 — Test Everything

VPS terminal:

```bash
cd /opt/isp-log-management
npm run test:log-ingest
```

Browser checks:

| URL | Expected |
|-----|----------|
| http://160.187.175.30 | Login page |
| http://160.187.175.30/api/health | `{"status":"ok"}` |
| http://160.187.175.30/syslog-health | `{"status":"ok",...}` |

Dashboard → **Logs**:
- Range: **Last 7 days**
- Device: **All devices**
- Badge: **Live** (green)

Manual test curl (VPS থেকে):

```bash
curl -X POST http://160.187.175.30/api/logs/receive \
  -H "Content-Type: text/plain" \
  -H "x-ingest-secret: CyberLink-Ingest-2026-Secret" \
  -H "x-router-ip: 160.187.175.26" \
  -d "<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info pppoe_user=test@clc mac_address=48:A9:8A:C2:28:BF user_ip=10.121.124.50 nat_ip=160.187.175.26 src-address=10.121.124.50:51234 dst-address=8.8.8.8:53 protocol=udp"
```

---

# PART 12 — Update / Redeploy (code change পর)

```bash
cd /opt/isp-log-management
git pull
npm ci
npm run build
npm run pm2:restart
```

---

# Troubleshooting

| সমস্যা | সমাধান |
|--------|---------|
| Site open হয় না | `pm2 status` + `sudo systemctl status nginx` |
| Login হয় না | `.env` এ `AUTH_URL=http://160.187.175.30` + `npm run build` + restart |
| Live কিন্তু log নেই | MikroTik → `160.187.175.30:514` check |
| UDP bind error | `sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))` |
| Empty table | Filter → **Last 7 days** |
| PM2 error log | `pm2 logs isp-syslog-listener --lines 50` |

---

# Quick Reference Card

```
VPS IP:           160.187.175.30
MikroTik IP:      160.187.175.26
Dashboard:        http://160.187.175.30
MikroTik syslog:  160.187.175.30:514 UDP
Project path:     /opt/isp-log-management
Env file:         .env.production.local
PM2 start:        npm run pm2:start
Test:             npm run test:log-ingest
```

---

আরও detail: [DEVELOPMENT.md](../DEVELOPMENT.md)
