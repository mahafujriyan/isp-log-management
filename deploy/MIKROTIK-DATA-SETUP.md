# MikroTik → VPS → Dashboard (বাংলা + English)

Router **offline** দেখালে বা log না আসলে এই checklist অনুসরণ করুন।

## Data flow

```
MikroTik Router                    VPS 160.187.175.30
     │                                      │
     │  UDP syslog port 514                 │
     └──────────────────────────────────────► isp-syslog-listener
                                              │
                                              ▼
                                    PostgreSQL tenant_001.session_logs
                                              │
                                              ▼
                                    Dashboard → Log Stream (port 3002)
```

---

## Step 1 — VPS check (SSH)

```bash
cd /opt/isp-log-management   # your app path

# All 4 processes must be "online"
pm2 status

# Must show: isp-operator, isp-syslog-listener, isp-marketing, isp-super-admin
pm2 logs isp-syslog-listener --lines 20

# Firewall — UDP 514 open
sudo ufw allow 514/udp
sudo ufw status

# Quick ingest test
npm run test:vps-ingest
```

If `isp-syslog-listener` is **errored**:
```bash
# .env.production.local must have:
# SOCKET_PORT=3003
# SYSLOG_UDP_PORT=514
pm2 restart isp-syslog-listener
```

---

## Step 2 — Device add (Dashboard)

**Device Manager → Add Device**

| Field | Example NAT router | Example ACCESS router |
|-------|-------------------|---------------------|
| Device name | Exabye_Core | CyberHome-DIS |
| Router IP | **160.187.175.9** | **160.187.175.46** |
| Type | NAT | ACCESS |
| NAT IP | 160.187.175.9 | **160.187.175.9** (shared gateway) |
| Username | admin | admin |
| Password | your MikroTik password | your password |
| Syslog port | 514 | 514 |

**গুরুত্বপূর্ণ:** **Device IP** = MikroTik যে IP থেকে syslog পাঠায় (Winbox IP)। ভুল IP দিলে সবসময় **Offline** দেখাবে।

---

## Step 3 — MikroTik syslog config

Log server IP: **`160.187.175.30`** port **`514`**

### Option A — Import script (recommended)

Winbox → **Files** → upload `deploy/mikrotik/clc-production.rsc` → **Terminal**:

```
/import file-name=clc-production.rsc
```

Edit script first if your router WAN IP is not `160.187.175.26`.

### Option B — Manual (RouterOS)

```
/system logging action
add name=clc-logserver target=remote remote=160.187.175.30 remote-port=514

/system logging
add topics=firewall,info action=clc-logserver
add topics=ppp,info action=clc-logserver
add topics=pppoe,info action=clc-logserver

/ip firewall filter
add chain=forward action=log log-prefix="FWD:" place-before=0

/ip firewall nat
add chain=srcnat action=log log-prefix="NAT:"
```

### Verify on MikroTik

```
/system logging action print
/system logging print where action=clc-logserver
/log print where topics~"firewall"
```

---

## Step 4 — Test log received on VPS

```bash
# Watch syslog worker (should show "UDP listener on 0.0.0.0:514")
pm2 logs isp-syslog-listener

# Count DB rows (should increase)
sudo -u postgres psql -d isp_logserver -c \
  "SELECT COUNT(*) FROM tenant_001.session_logs;"

# Send test log manually
npm run test:vps-ingest
```

---

## Step 5 — Dashboard

1. Open: `http://160.187.175.30:3002/dashboard`
2. Login: `admin@cyberlink.com` / `Admin@123456`
3. **Log Stream** → filter **All time** (historical logs)
4. **Last 1 hour** = only when router is live sending syslog
5. Device Manager → **Recheck** → status **● Receiving logs**

---

## Common problems

| Problem | Fix |
|---------|-----|
| All routers Offline | Device IP ≠ MikroTik IP; fix IP in Device Manager |
| Offline but DB has logs | MikroTik stopped sending; re-check syslog action |
| No logs at all | `pm2 status` — isp-syslog-listener offline; `ufw allow 514/udp` |
| 403 on ingest test | `INGEST_SECRET` in `.env.production.local` mismatch |
| Logs in DB, UI empty | Select **All time** filter; refresh page |
| After delete still broken | Device Manager → **Recheck** (cleans orphan router map) |
| Windows dev | UDP 514 needs admin; use VPS for real syslog |

---

## Your IPs (Cyber Link)

| Role | IP |
|------|-----|
| Log VPS | 160.187.175.30 |
| MikroTik (example) | 160.187.175.26 |
| Operator dashboard | http://160.187.175.30:3002 |

Syslog target: **160.187.175.30:514** (UDP only, not HTTP)
