# MikroTik Syslog Setup

## 1. Ubuntu log server (rsyslog)

```bash
sudo apt install rsyslog -y
sudo mkdir -p /var/log/mikrotik
sudo chown syslog:adm /var/log/mikrotik
sudo cp deploy/rsyslog/mikrotik.conf /etc/rsyslog.d/50-mikrotik.conf
sudo ufw allow 514/udp
sudo systemctl restart rsyslog
sudo systemctl status rsyslog
```

## 2. ISP Log Management listener (PM2)

```bash
npm install
npm run db:syslog
npm run build
pm2 start deploy/ecosystem.config.cjs
```

## 3. MikroTik RouterOS

1. Edit `deploy/mikrotik/routeros-syslog.rsc` — set `LOG_SERVER_IP` to your server IP.
2. Upload and import on each NAT router:

```
/import file-name=routeros-syslog.rsc
```

## 4. Register router in dashboard

Add device with router LAN/management IP matching syslog source IP, or let auto-discovery create a router on first packet.

## 5. Verify

```bash
# On server — watch live file
tail -f /var/log/mikrotik/isp-syslog.log

# API test
curl -X POST http://localhost:3000/api/logs/receive \
  -H "Content-Type: text/plain" \
  -H "x-ingest-secret: YOUR_INGEST_SECRET" \
  -d '<30>Jun  8 10:00:01 MK-NAT firewall,info FWD: pppoe_user=clc05@isp mac_address=AA:BB:CC:DD:EE:FF user_ip=10.10.1.5 nat_ip=103.1.2.3 src-address=10.10.1.5:51234 dst-address=8.8.8.8:53 protocol=udp'
```
