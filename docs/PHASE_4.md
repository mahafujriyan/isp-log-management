# PHASE 4: API Routes & Backend Logic

**Status: ✅ COMPLETE**

**Goal:** Next.js API routes for tenants, logs, devices, metrics, and users — backed by PostgreSQL services.

**Estimated time:** 5–7 hours

---

## Architecture

```
API Route (app/api/*)  →  Service layer (src/services/*)  →  PostgreSQL (multi-tenant schemas)
```

Shared helpers: `src/utils/api.utils.ts` (`apiError`, auth checks, ingest secret).

---

## STEP 4.1: Tenant API ✅

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/tenants` | Public | List tenants with plan names |
| POST | `/api/tenants` | super_admin, operator | Create tenant + provision schema |
| GET | `/api/tenants/[id]` | Public | Tenant detail + log/device counts |
| PATCH | `/api/tenants/[id]` | super_admin | Update status (`active` / `suspended` / `expired`) |
| GET | `/api/plans` | Public | Subscription plans |

POST creates an isolated PostgreSQL schema via `createTenant()` (not a timestamp-only schema name).

---

## STEP 4.2: Logs API ✅

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/logs` | Public | Query tenant syslogs |
| POST | `/api/logs` | Session or `x-ingest-secret` | Ingest log batch |

**GET query params:**

| Param | Aliases | Description |
|-------|---------|-------------|
| `tenant_id` | `tenantId` | Filter by tenant |
| `schema` | — | e.g. `tenant_001` |
| `limit` | — | Max rows (default 100, max 500) |
| `user` | — | PPPoE / IP search |
| `from` / `to` | — | Time range |
| `format=raw` | — | Return array only (spec-compatible) |

**POST ingest example:**

```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: YOUR_INGEST_SECRET" \
  -d '{
    "tenant_id": 1,
    "logs": [{
      "pppoe_user": "clc05@sohel3",
      "mac": "CC:2D:21:3F:BC:D0",
      "user_ip": "10.55.120.44",
      "nat_ip": "160.187.175.136",
      "visited_ip": "142.250.185.46",
      "port": 443,
      "nat_port": 51234,
      "protocol": "TCP"
    }]
  }'
```

Set `INGEST_SECRET` or reuse `CRON_SECRET` in `.env.local`.

---

## Additional routes (PHASE 4)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/devices?tenant_id=` | List MikroTik devices per tenant |
| POST | `/api/devices` | Register device in tenant schema |
| GET | `/api/dashboard/metrics` | Live counts from DB (mock fallback) |
| GET | `/api/users` | Admin users (authenticated) |
| GET | `/api/health` | DB connectivity check |
| * | `/api/btrc/*` | BTRC export/submit (from earlier phase) |

---

## Services

| File | Purpose |
|------|---------|
| `tenant.service.ts` | Tenant CRUD + schema provisioning |
| `syslog.service.ts` | Query + ingest syslogs |
| `device.service.ts` | Per-tenant device registry |
| `dashboard.service.ts` | Real metrics from `{schema}.syslogs` |
| `user.service.ts` | Platform user listing |

---

## Verify

```bash
npm run verify:phase4
npm run type-check
npm run dev

curl http://localhost:3000/api/health
curl http://localhost:3000/api/tenants
curl "http://localhost:3000/api/logs?tenantId=1&limit=10"
curl http://localhost:3000/api/dashboard/metrics
curl "http://localhost:3000/api/devices?tenant_id=1"
```

---

## Next: PHASE 5

Authentication hardening, role-based API guards, and session/tenant scoping.

See [READY_TO_START_GUIDE.md](READY_TO_START_GUIDE.md).
