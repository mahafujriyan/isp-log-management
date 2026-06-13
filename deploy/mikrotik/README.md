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

## Log format (parser accepts)
```
pppoe_user=username@isp
mac_address=AA:BB:CC:DD:EE:FF
user_ip=10.x.x.x
nat_ip=160.187.175.26
src-address=10.x.x.x:51234
dst-address=8.8.8.8:53
protocol=udp|tcp
```

MikroTik firewall log-prefix `FWD:` and `NAT:` also supported.
