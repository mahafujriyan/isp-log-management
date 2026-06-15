# VPS — পুরনো PM2 থেকে ৩ Portal (দ্রুত fix)

`isp-logserver` (পুরনো) চললে নতুন monorepo site ঠিকমতো কাজ করবে না।

---

## সমস্যা চিনবেন

| লক্ষণ | মানে |
|--------|------|
| `pm2 show isp-logserver` | পুরনো single-app PM2 |
| `lsof` এ শুধু `:80` | Node app port bind করছে না / crash |
| `cat .env` → No file | ভুল file — `.env.production.local` লাগবে |
| `max clients reached pool_size: 15` | Supabase session pool limit — port **6543** use করুন |

---

## Step 1 — Env file

```bash
cd /opt/isp-log-management
ls -la .env.production.local
```

না থাকলে:

```bash
cp deploy/env.vps.example .env.production.local
nano .env.production.local
```

**অবশ্যই fill করুন:** `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`

Supabase হলে **Transaction pooler** (port `6543`):

```env
DATABASE_URL=postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DATABASE_POOL_MAX=3
```

---

## Step 2 — Logs module আছে কিনা

```bash
ls packages/features/src/logs/
```

`index.ts` + `useLogSocket.ts` না থাকলে PC থেকে upload করুন (git pull)।

---

## Step 3 — Database migrations (api_user fix)

```bash
cd /opt/isp-log-management
npm run db:migrate
```

এটা add করবে: `api_user`, `api_password`, `api_port`, MikroTik routers, session_logs, branding, demo, SFP1 device।

---

## Step 4 — Build

```bash
cd /opt/isp-log-management
npm ci
npm run build:all
```

৩টা app সব `✓` হতে হবে।

---

## Step 5 — পুরনো PM2 বন্ধ → নতুন start

```bash
pm2 delete isp-logserver
pm2 delete isp-syslog-listener 2>/dev/null || true
pm2 delete all 2>/dev/null || true

npm run pm2:start
pm2 save
pm2 status
```

**Expected:**

| name | port |
|------|------|
| isp-marketing | 3000 |
| isp-super-admin | 3001 |
| isp-operator | 3002 |
| isp-syslog-listener | 514 UDP + socket 3001 |

---

## Step 6 — Port check

```bash
sudo ss -tlnp | grep -E '3000|3001|3002'
curl -s http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3001/
```

---

## Step 7 — nginx (port 80 → operator)

পুরনো config `:3000` এ proxy করত। Monorepo-তে main site = **operator :3002**।

```bash
cd /opt/isp-log-management
sudo cp deploy/nginx/logserver.conf /etc/nginx/sites-available/isp-logserver
sudo ln -sf /etc/nginx/sites-available/isp-logserver /etc/nginx/sites-enabled/isp-logserver
sudo nginx -t && sudo systemctl reload nginx
```

Test:

```bash
curl -I http://127.0.0.1/
curl -I http://160.187.175.30/
```

---

## URLs

| Access | URL |
|--------|-----|
| Main (nginx) | http://160.187.175.30 |
| Operator direct | http://160.187.175.30:3002 |
| Super Admin | http://160.187.175.30:3001 |
| Marketing | http://160.187.175.30:3000 |

---

## এখনও কাজ না করলে

```bash
pm2 logs isp-operator --lines 50
pm2 logs isp-syslog-listener --lines 30
sudo tail -20 /var/log/nginx/error.log
```

Output paste করুন।
