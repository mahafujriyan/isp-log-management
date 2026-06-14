# ISP Log Management — Monorepo Architecture

Production-grade **3-portal monorepo** for separate domain deployment.

## Portal map

| Portal | App | Default port | Domain example |
|--------|-----|--------------|----------------|
| Marketing | `apps/marketing` | 3000 | `www.cyberlink.com` |
| Super Admin | `apps/super-admin` | 3001 | `admin.cyberlink.com` |
| Operator + API | `apps/operator` | 3002 | `app.cyberlink.com` |

Syslog worker: `workers/syslog-listener` (UDP 514 + Socket.IO)

## Folder structure

```
isp-log-management/
├── apps/
│   ├── marketing/          # Landing page only
│   ├── super-admin/        # Super Admin portal
│   └── operator/           # Operator portal + REST API + legacy /dashboard
├── packages/
│   ├── core/               # config, types, constants, utils, lib, services
│   ├── auth/               # NextAuth, middleware edge auth, hooks
│   ├── ui/                 # Shared UI primitives (Sidebar, NavLink, Tag)
│   └── features/           # Feature modules — each domain area has components
│       ├── logs/
│       ├── devices/
│       ├── tenants/
│       ├── billing/
│       ├── metrics/
│       ├── demo-requests/
│       ├── marketing/
│       ├── admin/
│       ├── operator/
│       ├── auth/
│       ├── console/
│       ├── btrc/
│       └── settings/
├── workers/
│   └── syslog-listener/
├── scripts/                # DB migrations, deploy helpers
└── deploy/                 # PM2, nginx, VPS configs
```

## Feature-based imports

Each feature exposes a barrel export:

```ts
import { LogStreamPanel, LogsTable } from "@isp/features/logs";
import { DeviceManagerPanel } from "@isp/features/devices";
import { TenantManager } from "@isp/features/tenants";
import { LandingPage } from "@isp/features/marketing";
import { AdminDashboard } from "@isp/features/admin";
```

Components live under `packages/features/src/<feature>/components/`.

## Cross-domain API (marketing → operator)

Marketing site calls operator API via env:

```env
NEXT_PUBLIC_API_URL=http://160.187.175.30:3002
NEXT_PUBLIC_OPERATOR_URL=http://160.187.175.30:3002
NEXT_PUBLIC_ADMIN_URL=http://160.187.175.30:3001
NEXT_PUBLIC_MARKETING_URL=http://160.187.175.30:3000
```

Use `apiUrl("/api/plans")` from `@isp/core/utils/portal-api.utils`.

## Development

```bash
npm install
npm run dev:marketing   # :3000
npm run dev:admin       # :3001
npm run dev:operator    # :3002
npm run syslog:listener
```

## Production build (VPS)

```bash
npm run build:all
npm run pm2:start
```

## Auth cookies across domains

For separate domains, each portal has its own NextAuth session on its domain.
Super Admin login: `apps/super-admin` → `/admin/login`
Operator login: `apps/operator` → `/auth/login`

Set per-app env:

```env
# apps/operator/.env.production.local
AUTH_URL=http://app.cyberlink.com
NEXTAUTH_URL=http://app.cyberlink.com
AUTH_COOKIE_SECURE=false   # HTTP VPS until SSL

# apps/super-admin/.env.production.local
AUTH_URL=http://admin.cyberlink.com
NEXTAUTH_URL=http://admin.cyberlink.com
```

Shared `AUTH_SECRET` and `DATABASE_URL` across all apps.

## Legacy `src/`

The old single-app `src/` folder is deprecated. Use `apps/*` and `packages/*`.
Run `npm run migrate:monorepo` only if restoring from pre-monorepo backup.
