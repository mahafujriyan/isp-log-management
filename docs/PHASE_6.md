# PHASE 6: Admin Panel & Tenant Management

**Status: ✅ COMPLETE**

**Goal:** Comprehensive Super Admin control panel for multi-tenant ISP log platform management.

**Estimated time:** 5–7 hours

---

## Access

| Requirement | Value |
|-------------|-------|
| URL | `/admin` |
| Role | `super_admin` only (middleware enforced) |
| Login | `/auth/super-admin` + security code |

---

## STEP 6.1: Admin Dashboard ✅

### Component structure

```
src/components/admin/
├── AdminDashboard.tsx   — main panel (data loading + layout)
├── AdminLayout.tsx      — header, nav, secure logout
├── AdminStats.tsx       — KPI cards (total / active / suspended / users)
├── PlansOverview.tsx    — subscription plan cards
├── TenantManager.tsx    — CRUD table + create form + status actions
└── index.ts             — barrel exports
```

Route: `src/app/admin/page.tsx` → `<AdminDashboard />`

---

## Features

### KPI metrics (live from API)

| Card | Source |
|------|--------|
| Total Tenants | `GET /api/tenants` |
| Active | tenants where `status === 'active'` |
| Suspended | tenants where `status === 'suspended'` |
| Platform Users | `GET /api/users` count |

### Tenant Manager

- **Create tenant** — admin name, email, plan → provisions PostgreSQL schema
- **List tenants** — ID, admin, email, schema, plan, status, created, expires
- **Status actions** — Activate / Suspend via `PATCH /api/tenants/[id]`
- Color-coded status badges (active / suspended / expired)

### Plans overview

Displays all plans from `GET /api/plans` with BDT pricing and limits.

---

## API integration

| Action | Endpoint |
|--------|----------|
| List tenants | `GET /api/tenants` |
| Create tenant | `POST /api/tenants` |
| Update status | `PATCH /api/tenants/[id]` `{ "status": "suspended" }` |
| List plans | `GET /api/plans` |
| List users | `GET /api/users` |

All require authenticated session with appropriate RBAC permissions (PHASE 5).

---

## UI design

Premium **dark Super Admin** theme:

- Amber/gold accents on `#0B1220` background
- Glassmorphism cards with `border-white/10`
- Link to operator dashboard + secure logout

---

## Verify

```bash
npm run verify:phase6
npm run dev
```

1. Sign in at `/auth/super-admin`
2. Open `/admin`
3. Verify stats, plans, tenant table
4. Create a test tenant
5. Suspend / activate a tenant

---

## Next: PHASE 7

Production deployment, environment hardening, and go-live checklist.

See [READY_TO_START_GUIDE.md](READY_TO_START_GUIDE.md).
