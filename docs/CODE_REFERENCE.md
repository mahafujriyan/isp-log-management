# Complete Code Reference Guide

All production-ready code files for **isp-log-management**.

---

## Project File Structure

```
isp-log-management/
├── docs/
│   ├── PHASE_1.md
│   ├── CODE_REFERENCE.md
│   ├── READY_TO_START_GUIDE.md
│   └── BTRC_INTEGRATION.md
├── scripts/
│   ├── init-db.sql
│   ├── btrc-migration.sql
│   └── verify-phase1.mjs
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── btrc/config|export|submit|status|cron/route.ts
│   │   │   ├── dashboard/metrics/route.ts
│   │   │   ├── health/route.ts
│   │   │   ├── logs/route.ts
│   │   │   ├── tenants/route.ts
│   │   │   └── users/route.ts
│   │   ├── admin/page.tsx
│   │   ├── auth/login/page.tsx
│   │   ├── auth/super-admin/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── admin/TenantManager.tsx
│   │   ├── auth/AuthShell.tsx, UserLoginForm.tsx, SuperAdminLoginForm.tsx
│   │   ├── btrc/BtrcPanel.tsx
│   │   ├── dashboard/DashboardApp.tsx, MetricCard.tsx, LogsTable.tsx, ...
│   │   ├── providers/AuthProvider.tsx
│   │   └── shared/Sidebar.tsx, Tag.tsx
│   ├── hooks/useHealthCheck.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── auth-config.ts
│   │   ├── types.ts
│   │   ├── mock-data.ts
│   │   ├── btrc.ts
│   │   └── btrc-service.ts
│   ├── middleware.ts
│   └── types/next-auth.d.ts
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Essential Code Files

### 1. `src/lib/db.ts` — Database Connection

```typescript
import { Pool, QueryResult, QueryResultRow } from "pg";

export class Database {
  private pool: Pool;
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  async query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> { ... }
  async getOne<T>(text: string, params?: unknown[]): Promise<T | null> { ... }
  async getMany<T>(text: string, params?: unknown[]): Promise<T[]> { ... }
}
export const db = new Database();
```

### 2. `src/app/api/health/route.ts` — Health Check

```typescript
GET /api/health
→ { status: "ok", database: "connected", timestamp, message }
```

### 3. `src/app/api/tenants/route.ts` — Tenant Management

```typescript
GET  /api/tenants     → list tenants
POST /api/tenants     → create tenant { admin_name, admin_email, plan_id }
```

### 4. `src/app/api/logs/route.ts` — Log Query

```typescript
GET /api/logs?limit=50&user=search
→ { logs: [...], count: N }
```

### 5. `src/app/api/users/route.ts` — User List

```typescript
GET /api/users → list admin users
```

### 6. `src/app/dashboard/page.tsx` — Main Dashboard

```typescript
import { DashboardApp } from "@/components/dashboard/DashboardApp";
export default function DashboardPage() {
  return <DashboardApp />;
}
```

### 7. `src/components/admin/TenantManager.tsx`

Reusable tenant table component — used in `/admin`.

### 8. `.env.local` — Environment Configuration

See `.env.example` for full list.

---

## SQL: Create Database & Tables

```bash
psql -U loguser -d isp_logserver -f scripts/init-db.sql
```

Creates: `plans`, `tenants`, `users`, `btrc_config`, `btrc_submissions`, `nat_logs`

---

## Quick Setup Commands

```bash
cd C:\projects\isp-log-management
npm install
copy .env.example .env.local
psql -U loguser -d isp_logserver -f scripts/init-db.sql
npm run verify:phase1
npm run dev
```

Test:

```bash
curl http://localhost:3000/api/health
```

---

## Deployment Commands

```bash
npm run build
npm start

# PM2
pm2 start "npm start" --name isp-logserver

# Vercel
vercel deploy --prod
```

---

## package.json Scripts

| Script | Command |
|--------|---------|
| `dev` | Start development server |
| `build` | Production build |
| `start` | Start production server |
| `type-check` | TypeScript validation |
| `verify:phase1` | Run PHASE 1 checks |
| `db:init` | Apply init-db.sql |

✅ All code ready to use.
