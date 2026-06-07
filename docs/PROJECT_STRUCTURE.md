# Project Structure — Premium Architecture

Enterprise-grade folder layout for ISP Log Server.

```
src/
├── app/                    # Next.js App Router (pages + API routes only)
│   ├── api/                # REST API endpoints
│   ├── auth/               # Login pages
│   ├── dashboard/          # Main dashboard
│   ├── admin/              # Super admin panel
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/             # UI components (presentation layer)
│   ├── admin/              # Admin-specific UI
│   ├── auth/               # Login forms & shells
│   ├── btrc/               # BTRC compliance UI
│   ├── dashboard/          # Dashboard widgets
│   ├── providers/          # React context providers
│   └── shared/             # Reusable UI (Sidebar, Tag, etc.)
│
├── config/                 # Application configuration
│   ├── env.config.ts       # Typed environment variables
│   ├── app.config.ts       # App name, company, timezone
│   ├── auth.config.ts      # Auth pages, demo users, session
│   ├── btrc.config.ts      # BTRC defaults & constants
│   └── index.ts            # Barrel export
│
├── constants/              # Static constants (no logic)
│   ├── routes.constants.ts # Route paths
│   ├── navigation.constants.ts  # Page titles, nav labels
│   └── index.ts
│
├── hooks/                  # Custom React hooks
│   └── useHealthCheck.ts
│
├── lib/                    # Core infrastructure
│   ├── database.ts         # PostgreSQL connection pool
│   ├── db.ts               # Backward-compat re-export
│   └── index.ts
│
├── services/               # Business logic layer
│   ├── auth.service.ts     # Authentication & NextAuth
│   ├── btrc.service.ts     # BTRC export/submit logic
│   ├── mock-data.service.ts # Demo data (until PHASE 4)
│   └── index.ts
│
├── types/                  # TypeScript type definitions
│   ├── entities.types.ts   # Plan, Tenant, User, LogEntry
│   ├── dashboard.types.ts  # Dashboard types
│   ├── auth.types.ts       # Auth types
│   ├── btrc.types.ts       # BTRC types
│   ├── next-auth.d.ts      # NextAuth module augmentation
│   └── index.ts
│
├── utils/                  # Pure utility functions
│   ├── date.utils.ts       # Date/time formatting
│   ├── crypto.utils.ts     # Hashing, batch IDs
│   ├── btrc.utils.ts       # BTRC format conversion
│   └── index.ts
│
└── middleware.ts           # Route protection
```

## Import Aliases

| Alias | Path | Use for |
|-------|------|---------|
| `@/config` | `src/config/index.ts` | Env, app settings |
| `@/constants` | `src/constants/index.ts` | Routes, nav labels |
| `@/types` | `src/types/index.ts` | All TypeScript types |
| `@/utils` | `src/utils/index.ts` | Pure helper functions |
| `@/services` | `src/services/index.ts` | Business logic |
| `@/lib/database` | PostgreSQL pool | Database queries |
| `@/components/*` | UI components | React components |
| `@/hooks/*` | Custom hooks | React hooks |

## Layer Rules

1. **`app/`** — routing only; delegate logic to services
2. **`components/`** — UI only; no direct DB access
3. **`services/`** — business logic; may use `lib/database`, `utils`, `config`
4. **`utils/`** — pure functions; no side effects, no DB
5. **`config/`** — static configuration; reads from env
6. **`types/`** — interfaces only; no runtime code
7. **`constants/`** — static values; no functions with side effects

## Example Import Pattern

```typescript
// API route
import { auth } from "@/services/auth.service";
import { db } from "@/lib/database";
import { ROUTES } from "@/constants";

// Component
import type { LogEntry } from "@/types";
import { PAGE_TITLES } from "@/constants/navigation.constants";
import { generateMockLogEntry } from "@/services/mock-data.service";

// Service
import { env, BTRC_CONFIG } from "@/config";
import { recordsToCsv } from "@/utils";
```
