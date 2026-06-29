# MikroTik → VPS Log Flow (Production)

## IPs

| Role | IP |
|------|-----|
| Log VPS (Ubuntu) | `160.187.175.30` |
| MikroTik CLC-SFP1-NAT | `160.187.175.26` |
| Database | Prisma Postgres (`pooled.db.prisma.io`) — cloud |

## MikroTik — import config

Winbox → Files → upload `clc-production.rsc` → Terminal:

```routeros
/import file-name=clc-production.rsc
```

Remote syslog target: `160.187.175.30:514`

## VPS — deploy (see full guide)

```bash
git clone YOUR_REPO /opt/isp-log-management
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local
# edit DATABASE_URL (Prisma), AUTH_SECRET, INGEST_SECRET, SOCKET_PORT=3003

npm ci
npm run db:migrate
npm run build:all
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
npm run pm2:start
pm2 save
```

Full steps: [deploy/VPS-HOSTING.md](../VPS-HOSTING.md)

## Test

```bash
npm run test:log-ingest
```

Dashboard → Logs → Last 7 days → tenant `tenant_001`

## Log format (ISP dashboard column)

```
pppoe_user=username@isp mac_address=AA:BB:CC:DD:EE:FF user_ip=10.x.x.x user_port=51234 nat_ip=160.187.175.26 visited_ip=8.8.8.8 visited_port=53 src-address=10.x.x.x:51234 dst-address=8.8.8.8:53 protocol=udp
```

`clc-production.rsc` PPPoE + firewall NAT logs এই format-এ পাঠায়।
