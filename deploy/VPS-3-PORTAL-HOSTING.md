# VPS — 3 Portal Hosting (Summary)

> **Main guide (PART 1–15, ৩ Section + Domain):** **[VPS-HOSTING.md](./VPS-HOSTING.md)**

---

## ৩ Section Map

| Section | Portal | Port | IP URL | Domain (পore) |
|---------|--------|------|--------|---------------|
| **1** | Marketing | 3000 | http://160.187.175.30:3000 | `deploy/domains.env` এ লিখুন |
| **2** | Super Admin | 3001 | http://160.187.175.30:3001 | `deploy/domains.env` এ লিখুন |
| **3** | Operator + API | 3002 | http://160.187.175.30:3002 | `deploy/domains.env` এ লিখুন |

---

## Quick deploy (IP mode — domain ছাড়া)

```bash
cd /opt/isp-log-management
cp deploy/env.vps.example .env.production.local   # edit secrets
npm ci && npm run build:all
npm run pm2:start && pm2 save
sudo ufw allow 3000/tcp && sudo ufw allow 3001/tcp && sudo ufw allow 3002/tcp
sudo ufw allow 514/udp && sudo ufw enable
```

---

## Domain add (পore)

1. `cp deploy/domains.template.env deploy/domains.env` → ৩ domain fill
2. DNS A record → `160.187.175.30`
3. `deploy/nginx/three-portals.template.conf` → nginx install
4. `.env.production.local` → https URLs
5. `certbot` → SSL
6. `npm run build:all && npm run pm2:restart`

**Full steps:** [VPS-HOSTING.md](./VPS-HOSTING.md) → PART 10–11
