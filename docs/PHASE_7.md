# PHASE 7: Deployment & Production Setup

**Status: ✅ COMPLETE**

**Goal:** Production build, security headers, and deployment paths for Vercel or self-hosted (PM2 + Nginx).

**Estimated time:** 2–3 hours

---

## STEP 7.1: Build for production ✅

```bash
cd C:\projects\isp-log-management
npm ci
npm run type-check
npm run build
npm run start    # test locally on http://localhost:3000
```

Verify all phases (optional):

```bash
npm run verify:phase7
```

---

## STEP 7.2: `next.config.ts` ✅

Production settings enabled:

| Option | Value |
|--------|-------|
| `reactStrictMode` | `true` |
| `compress` | `true` (gzip) |
| `poweredByHeader` | `false` |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc. |

---

## STEP 7.3: Deploy to Vercel

### Prerequisites

- PostgreSQL reachable from Vercel (Neon, Supabase, RDS, or VPS)
- All env vars from `deploy/.env.production.example`

### Commands

```bash
npm install -g vercel
vercel login
vercel link          # first time
vercel env pull      # or set vars in Vercel dashboard
npm run build        # verify locally first
vercel deploy --prod
```

### Required Vercel environment variables

Set in **Project → Settings → Environment Variables**:

- `DATABASE_URL`
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `AUTH_URL` / `NEXTAUTH_URL` → `https://your-app.vercel.app`
- `NEXT_PUBLIC_APP_URL`
- `SUPER_ADMIN_SECURITY_CODE`
- `INGEST_SECRET`, `CRON_SECRET`
- BTRC vars as needed

After deploy, run DB migrations on your PostgreSQL host:

```bash
npm run db:init      # fresh
npm run db:phase2    # existing DB
```

---

## STEP 7.4: Self-hosted with PM2

On Ubuntu/Debian VPS:

```bash
# Install Node 20 + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# App setup
git clone <your-repo> /opt/isp-logserver
cd /opt/isp-logserver
cp deploy/.env.production.example .env.production.local
# Edit .env.production.local with real values

npm ci
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup    # follow printed command for boot persistence
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs isp-logserver
pm2 restart isp-logserver
```

---

## STEP 7.5: Nginx reverse proxy + SSL

1. Copy `deploy/nginx/logserver.conf` → `/etc/nginx/sites-available/logserver`
2. Replace `yourdomain.com` with your domain
3. Enable site and reload Nginx

```bash
sudo cp deploy/nginx/logserver.conf /etc/nginx/sites-available/logserver
sudo ln -s /etc/nginx/sites-available/logserver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Obtain free SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

5. Update `.env.production.local`:

```
AUTH_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Production checklist

- [ ] Strong `AUTH_SECRET` (32+ chars)
- [ ] Unique `SUPER_ADMIN_SECURITY_CODE`
- [ ] PostgreSQL not exposed publicly (firewall / private network)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] Nginx + HTTPS (HSTS via certbot block)
- [ ] PM2 or Vercel process monitoring
- [ ] Database backups scheduled
- [ ] `npm run build` passes in CI/CD

---

## Deploy folder

```
deploy/
├── ecosystem.config.cjs      # PM2
├── nginx/logserver.conf      # Nginx reverse proxy
└── .env.production.example   # Production env template
```

---

## System status

**✅ PRODUCTION READY** — all 7 phases complete.

| Phase | Topic |
|-------|-------|
| 1 | Next.js + PostgreSQL foundation |
| 2 | Multi-tenant schema |
| 3 | Dashboard UI |
| 4 | API routes |
| 5 | Auth & RBAC |
| 6 | Admin panel |
| 7 | Deployment |

See [READY_TO_START_GUIDE.md](READY_TO_START_GUIDE.md) for local development.
