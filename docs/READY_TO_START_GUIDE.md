# ISP Log Server — Ready to Start Guide

**Estimated setup time: 15–20 minutes**

This project is pre-scaffolded with production-ready code, API routes, PostgreSQL schema, and a premium dashboard UI matching your design reference.

---

## Pre-start checklist

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL 14+ running (`psql --version`)
- [ ] Code editor (VS Code recommended)
- [ ] Terminal access

---

## Quick start (7 steps)

### Step 1: Database setup

```bash
psql -U postgres
```

```sql
CREATE USER loguser WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE isp_logserver OWNER loguser;
GRANT ALL PRIVILEGES ON DATABASE isp_logserver TO loguser;
ALTER USER loguser CREATEDB;
\q
```

### Step 2: Clone / open project

```bash
cd C:\projects\isp-log-management
```

### Step 3: Install dependencies

```bash
npm install
```

### Step 4: Environment setup

Copy the example env file and edit if needed:

```bash
copy .env.example .env.local
```

On Linux/macOS:

```bash
cp .env.example .env.local
```

### Step 5: Create database tables

```bash
psql -U loguser -d isp_logserver -f scripts/init-db.sql
```

### Step 6: Start development server

```bash
npm run dev
```

### Step 7: Verify

| Check | URL / Action | Expected |
|-------|--------------|----------|
| Login page | http://localhost:3000 | Redirects to `/auth/login` |
| User login | `/auth/login` | Blue premium login portal |
| Super Admin | `/auth/super-admin` | Dark secure admin portal |
| Dashboard | After login → `/dashboard` | Full 14-section premium UI |
| Admin panel | Super admin → `/admin` | Tenant control center |
| Health API | `/api/health` | `{"status":"ok",...}` |

### Demo login credentials

**Regular dashboard** (`/auth/login`):
- Email: `admin@cyberlink.com`
- Password: `Admin@123456`

**Super Admin portal** (`/auth/super-admin`):
- Email: `superadmin@cyberlink.com`
- Password: `Super@Secure2026!`
- Security code: `CYBER-LINK-2026` (enter twice)

---

## Project structure

```
isp-log-management/
├── docs/READY_TO_START_GUIDE.md     ← You are here
├── scripts/init-db.sql              ← PostgreSQL schema
├── src/
│   ├── app/
│   │   ├── page.tsx                 ← Landing / ready page
│   │   ├── dashboard/page.tsx       ← Premium dashboard (14 sections)
│   │   ├── admin/page.tsx           ← Tenant manager
│   │   ├── auth/login/page.tsx      ← Login stub (PHASE 5)
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── tenants/route.ts
│   │       ├── logs/route.ts
│   │       ├── users/route.ts
│   │       └── dashboard/metrics/route.ts
│   ├── components/
│   │   ├── shared/Sidebar.tsx
│   │   ├── dashboard/MetricCard.tsx
│   │   ├── dashboard/LogsTable.tsx
│   │   └── dashboard/DashboardApp.tsx
│   └── lib/
│       ├── db.ts
│       ├── auth.ts
│       ├── types.ts
│       └── mock-data.ts
└── .env.example
```

---

## What you get after setup

- Working Next.js app on `localhost:3000`
- PostgreSQL connected (health endpoint)
- Premium dashboard with live mock log stream
- All API route stubs ready for PHASE 2–7
- Login page stub (auth wired in PHASE 5)

---

## Troubleshooting

### Cannot find module 'pg'

```bash
npm install pg @types/pg
```

### Database connection refused

```bash
psql -U loguser -d isp_logserver
```

Ensure PostgreSQL service is running and `DATABASE_URL` in `.env.local` is correct.

### AUTH_SECRET / NEXTAUTH_SECRET not defined

Ensure `.env.local` exists (copy from `.env.example`).

### Port 3000 already in use

```bash
npm run dev -- -p 3001
```

---

## Development phases (coming next)

| Phase | Topic |
|-------|-------|
| PHASE 1 | Foundation (this setup) ✅ |
| PHASE 2 | Extended database schema |
| PHASE 3 | Dashboard components (real data) |
| PHASE 4 | Log ingestion / API |
| PHASE 5 | Authentication (NextAuth) |
| PHASE 6 | Admin & tenant management |
| PHASE 7 | Deployment |
| PHASE 8 | Production hardening |

Send each phase document when ready — we'll implement step by step.

---

## Useful commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run type-check   # TypeScript check
npm run lint         # ESLint
curl http://localhost:3000/api/health
```

---

**Ready to start right now.** Open the dashboard at http://localhost:3000/dashboard after setup.
