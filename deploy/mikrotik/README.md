# MikroTik → VPS Log Flow (Production)

## IPs
| Role | IP |
|------|-----|
| Log VPS (Ubuntu) | 160.187.175.30 |
| MikroTik SFP1 WAN | 160.187.175.26 |

## MikroTik — import clc-production.rsc
Winbox → Files → upload `clc-production.rsc` → Terminal:
```
/import file-name=clc-production.rsc
```

## VPS — quick deploy
```bash
git clone YOUR_REPO /opt/isp-log-management
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
# edit DATABASE_URL, AUTH_SECRET, INGEST_SECRET

npm ci && npm run build
npm run db:vps
npm run pm2:start
sudo bash deploy/vps-setup.sh   # nginx + rsyslog + firewall (first time)
```

## Test log
```bash
npm run test:log-ingest
```
Dashboard → Logs → Last 7 days → tenant_001

## Log format (dashboard shows this exact ISP format)
```
pppoe_user=username@isp mac_address=AA:BB:CC:DD:EE:FF user_ip=10.x.x.x user_port=51234 nat_ip=160.187.175.26 visited_ip=8.8.8.8 visited_port=53 src-address=10.x.x.x:51234 dst-address=8.8.8.8:53 protocol=udp
```

MikroTik `clc-production.rsc` logs PPPoE login in this format automatically.
Firewall forward logs (`FWD:` / `src-address` / `dst-address`) are parsed and enriched with PPPoE user from session DB.
