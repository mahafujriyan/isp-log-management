# Session Handoff — ISP Log Management

> Paste-ready context for another Cursor/AI agent to understand the project state
> and everything changed in this session.

## Project stack
- **Monorepo** (Turborepo + npm workspaces), **Next.js 16.2.7** (Turbopack).
  ⚠️ This Next.js renames `middleware.ts` → **`proxy.ts`**.
- **Apps:** `marketing` (:3000), `super-admin` (:3001), `operator` (:3002 — hosts ALL `/api/*` routes).
- **Packages:** `@isp/core` (db, services, config, utils), `@isp/auth` (NextAuth v5),
  `@isp/features` (UI panels), `@isp/ui`.
- **Workers:** `syslog-listener`, `router-poller`.
- **DB:** PostgreSQL (`public` + per-tenant `tenant_xxx` schemas).
- **Auth:** NextAuth v5, JWT sessions (8h). **Realtime:** Socket.IO.

## What was changed this session

### 1. Log Stream "data disappears on refresh" — FIXED
- `apps/operator/src/app/api/logs/route.ts`: removed all response caching (was serving
  stale/empty). Now `export const dynamic = "force-dynamic"`, `revalidate = 0`, header
  `no-store`. Live logs are always fresh.
- Caching (via `withRequestCache`) is still used only on `/api/dashboard/metrics` and
  `/api/metrics` (non-realtime).

### 2. "All pages just show loading, no data" — FIXED
- Root cause: `packages/auth/src/hooks/useTenantContext.ts` blocked every page's data
  fetch on the `/api/tenants` fetch (`tenantLoading` gate).
- Now `tenantId` is set **immediately from the session**; tenant list loads in the
  background; `loading` is true only until a tenant is known. Pages render data right away.

### 3. Operator portal nav
- Overview dashboard page (`/operator`) kept (stat cards + quick links).
- Removed the **"Full Console"** (legacy `/dashboard`) "optional portal" from the sidebar
  nav (`OPERATOR_NAV` in `packages/core/src/constants/portal.constants.ts`) and from the
  overview quick links.
- Note: **Super Admin is a separate app** at `:3001/admin/login` (not in operator nav).

### 4. Authentication/authorization → production-grade
New files:
- `packages/core/src/lib/cache/redis.ts` — shared lazy Redis client (used by cache + rate-limit).
- `packages/core/src/lib/security/rate-limit.ts` — fixed-window limiter: Redis atomic
  `INCR`/`EXPIRE` if `REDIS_URL` set, else in-memory. `checkRateLimit` / `peekRateLimit` /
  `resetRateLimit`.
- `packages/core/src/utils/net.utils.ts` — `getClientIp` (x-forwarded-for/cf/x-real-ip),
  `getDeviceId` (server-side fingerprint from IP+UA+lang, or `dev_id` cookie / `x-device-id`).
- `packages/core/src/services/security-events.service.ts` — auto-creates
  `public.security_events` table; `recordSecurityEvent`, `getRecentSecurityAlerts`
  (super_admin sees all; others see null-tenant + own tenant).
- `apps/operator/src/app/api/security/alerts/route.ts` — `GET`, gated by new
  `SECURITY_READ` permission (super_admin + operator), tenant-scoped, no-store.
- `packages/features/src/console/components/SecurityAlertBar.tsx` — red pulsing alert strip
  (+ compact badge), polls the alerts API.

Behavior added:
- **Account/demo requests** (`api/demo-request/route.ts`): max **3 per device** and
  **5 per IP per 10 min** → `429` + `Retry-After`; blocked attempts recorded as `critical`
  security events.
- **Login brute-force** (`packages/auth/src/auth.ts` `authorize`): **5 failed attempts /
  IP / 10 min → temporary lockout**; failed/blocked logins recorded; counter reset on
  success. Uses the `request` arg for IP.
- **Red alerts** shown in Log Stream (top of `LogStreamPanel`) and on the operator overview page.
- Added permission `SECURITY_READ` in `packages/core/src/constants/roles.constants.ts`.

### 5. Anti-bypass / lockdown
- **Hardcoded demo credentials disabled in production**
  (`packages/core/src/services/auth.service.ts`): `if (env.isProd) return null;` before the
  `AUTH_CONFIG.demoUsers` fallback. Prod = DB-only auth.
- **Super-admin security code** (`packages/core/src/config/env.config.ts`): no public default
  in prod. If `SUPER_ADMIN_SECURITY_CODE` is unset in prod → super-admin login **fails
  closed** (auth.ts rejects, won't accept blank code).
- **`/api/health`**: no longer leaks DB error message/timestamp — returns `{status:"ok"}`
  or `503` only.
- **Login forms** (`UserLoginForm.tsx`, `SuperAdminLoginForm.tsx`): removed "PHASE 5"
  placeholder; demo credentials + dev security code hint now render **only when
  `NODE_ENV !== "production"`**.
- API authz model: `proxy.ts` protects pages only; every `/api` route self-guards via
  `requirePermission` + `resolveTenantScope` (audited all 41 routes — only public
  `demo-request` is intentionally open, now rate-limited; ingest routes require
  `x-ingest-secret`).

## Required production env vars
- `DATABASE_URL` (required)
- `AUTH_SECRET` / `NEXTAUTH_SECRET` (32+ chars; **no prod fallback** — NextAuth won't work without it)
- `SUPER_ADMIN_SECURITY_CODE` (**required for super-admin login in prod**; unset = login disabled)
- `INGEST_SECRET` (syslog/log ingestion), `CRON_SECRET` (demo-expiry cron)
- `REDIS_URL` (optional but recommended for shared rate-limiting across instances)
- `NEXT_PUBLIC_MARKETING_URL` / `_ADMIN_URL` / `_OPERATOR_URL`

## Verification status
- `apps/operator`, `apps/super-admin`, `apps/marketing` all build clean (`next build`,
  TypeScript passes).

## Known follow-ups (not done — no request)
- Full TOTP MFA (deliberately skipped; current super-admin = password + shared authorization
  code + IP lockout).
- The legacy `/dashboard` (Full Console) route still exists but is unlinked; can be removed
  if desired.
