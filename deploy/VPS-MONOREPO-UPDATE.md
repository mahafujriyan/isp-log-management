# VPS Update — Monorepo (3 Portals)

> **সম্পূর্ণ guide:** [VPS-HOSTING.md](./VPS-HOSTING.md) — ৩ Section + Domain (PART 1–15)  
> **Summary:** [VPS-3-PORTAL-HOSTING.md](./VPS-3-PORTAL-HOSTING.md)

VPS IP: **160.187.175.30**

## URLs after update

| Portal | URL |
|--------|-----|
| Marketing | http://160.187.175.30:3000 |
| Super Admin | http://160.187.175.30:3001/admin/login |
| Operator | http://160.187.175.30:3002/auth/login |

## VPS এ update (SSH)

```bash
cd /opt/isp-log-management
git pull

# env update — copy from deploy/env.vps.example if first time
nano .env.production.local

npm install
npm run build:all
npm run pm2:restart
pm2 status
```

## Firewall (ports open)

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw reload
```

## `.env.production.local` (minimum)

```env
NEXT_PUBLIC_MARKETING_URL=http://160.187.175.30:3000
NEXT_PUBLIC_ADMIN_URL=http://160.187.175.30:3001
NEXT_PUBLIC_OPERATOR_URL=http://160.187.175.30:3002
NEXT_PUBLIC_API_URL=http://160.187.175.30:3002
AUTH_ADMIN_URL=http://160.187.175.30:3001
AUTH_OPERATOR_URL=http://160.187.175.30:3002
AUTH_URL=http://160.187.175.30:3002
NEXTAUTH_URL=http://160.187.175.30:3002
AUTH_COOKIE_SECURE=false
DATABASE_URL=postgresql://...
AUTH_SECRET=...
```

## Old single-port setup

আগে শুধু `:3000` এ সব ছিল। এখন monorepo — **৩টা port** লাগবে, অথবা nginx domain setup (`deploy/nginx/three-portals.conf`).

Local এ যা কাজ না করলে VPS এ same URL mistake হবে — `160.187.175.30:3000/admin` কাজ করবে **না**। Admin = **:3001**।
