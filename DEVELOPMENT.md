# ISP Log Management — Development & Deployment Guide

Complete guide for **local development** and **VPS production** (Cyber Link Communication).

---

## Infrastructure Overview

```
MikroTik Router (160.187.175.26)
        │  UDP syslog :514
        ▼
VPS Ubuntu (160.187.175.30)
  ├── PM2: isp-syslog-listener  (parse + DB + Socket.IO :3001)
  ├── PM2: isp-logserver        (Next.js :3000)
  └── Nginx :80                 (proxy web + /socket.io)
        │
        ▼
PostgreSQL (Supabase or local)
        │
        ▼
Dashboard  →  http://160.187.175.30
```

| Role | IP | Port |
|------|-----|------|
| Log VPS + Dashboard | **160.187.175.30** | 80, 443, 514/udp, 3000, 3001 |
| MikroTik NAT (SFP1) | **160.187.175.26** | sends syslog → VPS |

---

## 1. Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (or Supabase `DATABASE_URL`)

### Setup

```bash
git clone <repo>
cd isp-log-management
npm install
copy .env.example .env.local    # Windows
# cp .env.example .env.local    # Linux/Mac
```

### `.env.local` (minimum)

```env
DATABASE_URL=postgresql://USER:PASS@HOST:5432/postgres
AUTH_SECRET=your-random-64-char-secret
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

INGEST_SECRET=local-dev-secret-123
DEFAULT_TENANT_SCHEMA=tenant_001

# Local syslog (Windows: use 5514, not 514)
SYSLOG_UDP_PORT=5514
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

IMGBB_API_KEY=your-key          # optional — logo upload
```

### Database

```bash
npm run db:setup          # full schema (first time)
npm run db:syslog         # routers, session_logs, pppoe_users
npm run db:register-sfp1  # register MikroTik 160.187.175.26
npm run db:demo           # demo sandbox (optional)
```

### Run (2 terminals)

```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — Syslog listener + Socket.IO
npm run syslog:listener
```

Open: http://localhost:3000

### Test log ingest (local)

```bash
npm run test:log-ingest
```

Or manual curl:

```bash
curl -X POST http://localhost:3000/api/logs/receive \
  -H "Content-Type: text/plain" \
  -H "x-ingest-secret: local-dev-secret-123" \
  -H "x-router-ip: 160.187.175.26" \
  -d "<30>Jun  8 15:00:01 CLC-SFP1-NAT firewall,info pppoe_user=test@clc mac_address=48:A9:8A:C2:28:BF user_ip=10.121.124.50 nat_ip=160.187.175.26 src-address=10.121.124.50:51234 dst-address=8.8.8.8:53 protocol=udp"
```

### Demo logins

| Role | Email | Password | Extra |
|------|-------|----------|-------|
| Operator | `admin@cyberlink.com` | `Admin@123456` | — |
| Super Admin | `superadmin@cyberlink.com` | `Super@Secure2026!` | Code: `CYBER-LINK-2026` |

---

## 2. VPS Production (160.187.175.30)

### One-time server setup

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
nano .env.production.local          # fill DATABASE_URL, secrets

npm ci
npm run build
npm run db:vps
sudo bash deploy/vps-setup.sh       # nginx, rsyslog, ufw, pm2
```

### `.env.production.local` (production)

```env
NODE_ENV=production

NEXT_PUBLIC_APP_URL=http://160.187.175.30
AUTH_URL=http://160.187.175.30
NEXTAUTH_URL=http://160.187.175.30
NEXT_PUBLIC_SOCKET_URL=http://160.187.175.30

DATABASE_URL=postgresql://...@supabase...?sslmode=require
AUTH_SECRET=...
NEXTAUTH_SECRET=...
INGEST_SECRET=...
CRON_SECRET=...
DEFAULT_TENANT_SCHEMA=tenant_001

SYSLOG_UDP_PORT=514
SOCKET_PORT=3001
SYSLOG_FILE=/var/log/mikrotik/isp-syslog.log
PORT=3000
```

### PM2 commands

```bash
npm run pm2:start      # start app + syslog listener
npm run pm2:restart    # after code/env change
npm run pm2:stop
npm run pm2:logs
pm2 save && pm2 startup
```

### Nginx

Config: `deploy/nginx/logserver.conf`

```bash
sudo cp deploy/nginx/logserver.conf /etc/nginx/sites-available/isp-logserver
sudo ln -sf /etc/nginx/sites-available/isp-logserver /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 514/udp
sudo ufw enable
```

### Production URLs

| Service | URL |
|---------|-----|
| Dashboard | http://160.187.175.30 |
| Health | http://160.187.175.30/api/health |
| Socket.IO | http://160.187.175.30/socket.io/ |
| Log ingest API | POST http://160.187.175.30/api/logs/receive |

---

## 3. MikroTik Configuration

**Router:** 160.187.175.26 (SFP1 WAN)  
**Log target:** 160.187.175.30:514 UDP

### Import ready script

Upload `deploy/mikrotik/clc-production.rsc` to router, then:

```
/import file-name=clc-production.rsc
```

### Manual RouterOS

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

### Register router in dashboard

**Devices** → Add:

| Field | Value |
|-------|-------|
| Name | CLC-SFP1-NAT |
| Device IP | 160.187.175.26 |
| NAT IP | 160.187.175.26 |
| Config | NAT |

Or run: `npm run db:register-sfp1`

---

## 4. Syslog Log Format

Parser accepts MikroTik key=value and firewall logs:

```
pppoe_user=clc05@cyberlink
mac_address=48:A9:8A:C2:28:BF
user_ip=10.121.124.50
nat_ip=160.187.175.26
src-address=10.121.124.50:51234
dst-address=8.8.8.8:53
protocol=udp
```

Stored in:

| Table | Schema | Purpose |
|-------|--------|---------|
| `session_logs` | per-tenant | Primary NAT/session logs |
| `syslogs` | per-tenant | Legacy + compatibility |
| `pppoe_users` | per-tenant | Subscriber registry |
| `routers` | per-tenant | MikroTik devices |
| `nat_logs` | public | BTRC compliance |

---

## 5. API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/logs` | Session | Query logs (tenant, date, filters) |
| GET | `/api/logs/search` | Session | Advanced search |
| GET | `/api/logs/user/:username` | Session | Per PPPoE user history |
| POST | `/api/logs/receive` | `x-ingest-secret` | Raw syslog ingest |
| POST | `/api/logs` | `x-ingest-secret` | Batch JSON ingest |
| GET | `/api/devices` | Session | List routers/devices |
| GET | `/api/health` | Public | DB health check |

Ingest header:

```
x-ingest-secret: YOUR_INGEST_SECRET
x-router-ip: 160.187.175.26    # optional
```

---

## 6. Project Structure (log system)

```
src/
├── app/api/logs/           # REST API routes
│   ├── route.ts            # GET/POST logs
│   ├── receive/route.ts    # Raw syslog ingest
│   ├── search/route.ts     # Search
│   └── user/[username]/    # Per-user logs
├── lib/
│   ├── syslog/             # RFC3164 parser
│   ├── parser/             # MikroTik parser
│   └── db/ingest.ts        # PostgreSQL ingest
├── services/
│   ├── syslog.service.ts
│   ├── syslog-ingest.service.ts
│   └── syslog-listener/run.ts   # UDP + Socket.IO daemon
└── components/
    ├── dashboard/LogStreamPanel.tsx
    └── log-stream/useLogSocket.ts

deploy/
├── env.vps.example         # VPS env template
├── ecosystem.config.cjs    # PM2
├── nginx/logserver.conf
├── vps-setup.sh
└── mikrotik/clc-production.rsc
```

---

## 7. npm Scripts

```bash
npm run dev                 # Next.js dev server
npm run build               # Production build
npm run start               # Production Next.js
npm run type-check          # TypeScript

npm run syslog:listener     # Syslog UDP + Socket.IO

npm run db:setup            # Full DB init
npm run db:syslog           # MikroTik tables migration
npm run db:register-sfp1    # Register router 160.187.175.26
npm run db:vps              # syslog + register (production)

npm run test:log-ingest     # Send test log to API

npm run pm2:start           # Start both PM2 processes
npm run pm2:restart
npm run pm2:logs
```

---

## 8. Dashboard — Live vs Polling

| Badge | Meaning |
|-------|---------|
| **Live** (green) | Socket.IO connected — instant log updates |
| **Polling (4s)** | Syslog listener not running — API refresh every 4s |

Logs still appear in Polling mode. For Live:

1. `npm run syslog:listener` (local) or PM2 `isp-syslog-listener` (VPS)
2. `NEXT_PUBLIC_SOCKET_URL` matches dashboard URL
3. Nginx proxies `/socket.io/` → port 3001 (VPS)

**Log stream filter:** default **Last 7 days** (not today only).

---

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| Empty log table | Set range to **Last 7 days** or **All time** |
| Live but no data | MikroTik not sending — check `160.187.175.30:514` |
| `ingested 0` | Run `npm run test:log-ingest` — if OK, fix MikroTik |
| Socket error local | Start `npm run syslog:listener` |
| UDP 514 bind fail (Windows) | Set `SYSLOG_UDP_PORT=5514` |
| Login fail on VPS | Set `AUTH_URL=http://160.187.175.30` + rebuild |
| Unknown router ingest | Run `npm run db:register-sfp1` |
| PM2 crash | `pm2 logs isp-syslog-listener` |

### Verify stack

```bash
curl http://160.187.175.30/api/health
curl http://160.187.175.30/syslog-health
npm run test:log-ingest
pm2 status
```

---

## 10. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `AUTH_SECRET` | Yes | Session encryption (32+ chars) |
| `AUTH_URL` | Yes | Public app URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Client-side app URL |
| `INGEST_SECRET` | Yes | Syslog API auth header |
| `DEFAULT_TENANT_SCHEMA` | Yes | Fallback tenant (`tenant_001`) |
| `NEXT_PUBLIC_SOCKET_URL` | VPS | Same as app URL with nginx |
| `SYSLOG_UDP_PORT` | VPS | 514 (prod) / 5514 (local Windows) |
| `SOCKET_PORT` | VPS | 3001 |
| `IMGBB_API_KEY` | No | Company logo upload |
| `SUPER_ADMIN_SECURITY_CODE` | No | Super admin login code |
| `CRON_SECRET` | No | BTRC cron jobs |

---

## 11. Deploy Checklist

- [ ] VPS IP: **160.187.175.30**
- [ ] `.env.production.local` configured
- [ ] `npm run build && npm run db:vps`
- [ ] PM2 both apps running (`isp-logserver`, `isp-syslog-listener`)
- [ ] Nginx configured + port 80 open
- [ ] UDP 514 open for MikroTik
- [ ] MikroTik syslog → `160.187.175.30:514`
- [ ] Router registered: `160.187.175.26`
- [ ] `npm run test:log-ingest` returns 201
- [ ] Dashboard shows **Live** + log rows

---

## Related Docs

- **[VPS Hosting Guide (step-by-step)](deploy/VPS-HOSTING.md)** — copy-paste deploy on `160.187.175.30`
- [MikroTik deploy files](deploy/mikrotik/README.md)
