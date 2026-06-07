# PHASE 1: Next.js Project Setup & PostgreSQL

**Status: ✅ COMPLETE**

**Goal:** Production-ready Next.js project with TypeScript, PostgreSQL connection, and environment setup.

**Estimated time:** 2–3 hours (already done in this repo)

---

## Pre-requirements

- [x] Node.js 20+ installed
- [x] PostgreSQL 14+ running
- [x] npm installed

Verify:

```bash
node --version    # v20+
psql --version    # 14+
npm run verify:phase1
```

---

## STEP 1.1: Create Next.js Project ✅

Project: `isp-log-management` (Next.js 16, App Router, TypeScript, Tailwind CSS 4)

```bash
# Already created — no action needed
cd C:\projects\isp-log-management
```

---

## STEP 1.2: Install Dependencies ✅

All PHASE 1 packages installed:

| Package | Purpose |
|---------|---------|
| `pg` | PostgreSQL driver |
| `next-auth@beta` | Authentication |
| `bcryptjs` | Password hashing |
| `axios` | HTTP client |
| `zustand` | State management |
| `lucide-react` | Icons |
| `chart.js` | Dashboard charts (bonus) |

```bash
npm install
```

---

## STEP 1.3: Folder Structure ✅

```
src/
├── app/              # Routes & API only
├── components/       # UI layer
├── config/           # env, app, auth, btrc settings
├── constants/        # routes, navigation
├── hooks/            # React hooks
├── lib/              # database (infrastructure)
├── services/         # business logic
├── types/            # TypeScript interfaces
└── utils/            # pure helper functions
```

Full details: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## STEP 1.4: Environment Variables ✅

```bash
copy .env.example .env.local
```

Required variables:

```env
DATABASE_URL=postgresql://loguser:StrongPassword123!@localhost:5432/isp_logserver
AUTH_SECRET=your-32-char-secret-minimum
AUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-char-secret-minimum
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## STEP 1.5: Database Connection ✅

File: `src/lib/db.ts`

- Connection pool (max 20 connections)
- `query()`, `getOne()`, `getMany()` helpers
- Error logging in development

---

## STEP 1.6: PostgreSQL Setup ✅

```bash
# 1. Create user & database (psql as postgres)
CREATE USER loguser WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE isp_logserver OWNER loguser;
GRANT ALL PRIVILEGES ON DATABASE isp_logserver TO loguser;

# 2. Apply schema
psql -U loguser -d isp_logserver -f scripts/init-db.sql
```

Tables created:
- `plans`, `tenants`, `users`
- `btrc_config`, `btrc_submissions`, `nat_logs`

---

## STEP 1.7: Test Connection ✅

```bash
# Start dev server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-06-07T...",
  "message": "Database connection successful!"
}
```

Or run full verification:

```bash
npm run verify:phase1
```

---

## PHASE 1 Success Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Node.js 20+ installed | ✅ |
| 2 | Next.js project created | ✅ |
| 3 | All packages installed | ✅ |
| 4 | `.env.local` configured | ✅ |
| 5 | Database connection tested | ✅ |
| 6 | `src/lib/db.ts` created | ✅ |
| 7 | API routes (health, tenants, logs, users) | ✅ |
| 8 | Dashboard page working | ✅ |
| 9 | Login + auth middleware | ✅ (bonus) |
| 10 | BTRC integration scaffold | ✅ (bonus) |

---

## Useful Commands

```bash
npm run dev              # Development server
npm run build            # Production build
npm run type-check       # TypeScript check
npm run verify:phase1    # PHASE 1 verification
npm run db:init          # Apply init-db.sql (requires psql)
```

---

## Demo Login (after npm run dev)

| Portal | URL | Credentials |
|--------|-----|-------------|
| User | `/auth/login` | admin@cyberlink.com / Admin@123456 |
| Super Admin | `/auth/super-admin` | superadmin@cyberlink.com / Super@Secure2026! / CYBER-LINK-2026 |

---

## Next: PHASE 2

Extended database schema, tenant schemas, and real log tables.

Send PHASE 2 document when ready.
