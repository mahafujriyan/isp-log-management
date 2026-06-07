# PHASE 5: Authentication & Authorization

**Status: ✅ COMPLETE**

**Goal:** Secure authentication with NextAuth.js (Auth.js v5) and role-based access control across pages and API routes.

**Estimated time:** 4–5 hours

---

## Stack

| Piece | Location |
|-------|----------|
| NextAuth v5 setup | `src/auth.ts` |
| Edge-safe JWT config | `src/auth.config.ts` |
| Credential verification | `src/services/auth.service.ts` |
| Auth route handler | `src/app/api/auth/[...nextauth]/route.ts` |
| Legacy re-export | `src/lib/auth.ts` → `@/auth` |
| Session provider | `src/components/providers/AuthProvider.tsx` |

Uses **`public.users`** (bcrypt password hashes) — not the `tenants` table from the basic spec.

---

## STEP 5.1: Auth configuration ✅

### Portals

| Portal | URL | Extra gate |
|--------|-----|------------|
| User / Operator | `/auth/login` | — |
| Super Admin | `/auth/super-admin` | Security code (`SUPER_ADMIN_SECURITY_CODE`) |

### Demo credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@cyberlink.com` | `Admin@123456` | operator |
| `superadmin@cyberlink.com` | `Super@Secure2026!` | super_admin |

Super Admin portal also requires code: `CYBER-LINK-2026` (env override).

### Session (JWT)

Stored in token and exposed on `session.user`:

- `id` — user id from database
- `role` — `super_admin` | `operator` | `viewer`
- `username` — display name

---

## STEP 5.2: Login pages ✅

| Page | Component |
|------|-----------|
| `/auth/login` | `UserLoginForm` — premium AuthShell UI |
| `/auth/super-admin` | `SuperAdminLoginForm` — dark secure portal |

Both use `signIn("credentials", { portal: "user" | "super_admin", ... })`.

---

## Role-based access control (RBAC)

### Roles (`src/constants/roles.constants.ts`)

| Role | Rank | Typical access |
|------|------|----------------|
| `super_admin` | 3 | Admin panel, tenant lifecycle, all APIs |
| `operator` | 2 | Dashboard, logs, devices, BTRC |
| `viewer` | 1 | Read-only dashboard & logs |

### Permissions

```typescript
import { PERMISSIONS } from "@/constants";
// TENANT_CREATE, TENANT_READ, LOGS_READ, LOGS_INGEST, BTRC_MANAGE, ...
```

### Server (API routes)

```typescript
import { requirePermission } from "@/utils/api.utils";

const { error } = await requirePermission("LOGS_READ");
if (error) return error;
```

### Client (React)

```typescript
import { useRole } from "@/hooks/useRole";

const { can, isSuperAdmin } = useRole();
if (can("BTRC_MANAGE")) { /* ... */ }
```

---

## Route protection

### Middleware (`src/middleware.ts`)

- `/dashboard/*` — requires login
- `/admin/*` — requires `super_admin`
- `/` — redirects to login or dashboard
- Auth pages redirect away when already logged in

### API routes (authenticated unless noted)

| Route | Permission |
|-------|------------|
| `/api/logs` GET | `LOGS_READ` |
| `/api/logs` POST | session or `x-ingest-secret` |
| `/api/tenants` | `TENANT_READ` / `TENANT_CREATE` |
| `/api/devices` | `DEVICE_READ` / `DEVICE_WRITE` |
| `/api/users` | `USERS_READ` |
| `/api/btrc/*` | `BTRC_MANAGE` |
| `/api/dashboard/metrics` | `LOGS_READ` |
| `/api/health` | public |
| `/api/plans` | public |

---

## Environment

```bash
AUTH_SECRET=...                    # min 32 chars
SUPER_ADMIN_SECURITY_CODE=CYBER-LINK-2026
INGEST_SECRET=...                  # optional syslog ingest bypass
```

---

## Verify

```bash
npm run verify:phase5
npm run type-check
npm run dev
```

1. Open `/auth/login` → sign in as operator → `/dashboard`
2. Open `/admin` as operator → redirected to dashboard
3. Sign in via `/auth/super-admin` → `/admin`

---

## Next: PHASE 6

Admin & tenant management UI wired to secured APIs.

See [READY_TO_START_GUIDE.md](READY_TO_START_GUIDE.md).
