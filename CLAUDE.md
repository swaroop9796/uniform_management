# Restaurant Management SaaS — Claude Context

## Project Goal
Multi-tenant restaurant management SaaS. First client is a restaurant in Bangalore with 5 branches.
Building MVP for a demo, starting with the Uniform/Asset Management module.
Demo target: laptop (local dev), later deployed to production.

---

## Tech Stack

### Frontend
- React + Vite
- Tailwind CSS via `@tailwindcss/vite` plugin
- shadcn/ui for components
- React Router v7 for navigation
- PWA via `vite-plugin-pwa`
- Primary users are on phones and tablets — always mobile-first

### Backend
- Supabase (single project)
  - PostgreSQL database
  - Supabase Auth (email/password)
  - Supabase Storage (images/documents)
  - Supabase Edge Functions (custom logic)
- No separate backend service

### Package Manager
- **Always use pnpm** — never npm or yarn

---

## Architecture

### Multi-tenancy
- Every table has `tenant_id` (UUID)
- One tenant = one restaurant company
- Each tenant has multiple branches (`branch_id`)
- Supabase RLS enforces tenant isolation

### Database Rules
- Every table must have: `id` (UUID), `tenant_id` (UUID), `created_at`, `updated_at`
- RLS must be enabled on every table — no exceptions
- Schema changes = SQL migration files in `supabase/migrations/` only
- Never edit schema via Supabase dashboard

### User Roles
- `owner` — full access across all branches
- `hr_admin` — manage staff, uniforms, procurement across branches
- `branch_manager` — manage their branch only
- `staff` — view only (what's assigned to them)

---

## Local Development
- Supabase runs locally via Docker (`supabase start`)
- Local Supabase dashboard: http://127.0.0.1:54323
- Local API: http://127.0.0.1:54321
- Keys go in `.env.local` (gitignored) — get values from `supabase status`
  - `Publishable` key → `VITE_SUPABASE_ANON_KEY` (newer Supabase CLI naming, same as anon key)
  - `Secret` key → service role key (backend only, never expose in frontend)
- Apply schema + seed: `supabase db reset` (runs all migrations then seed.sql)
- Dev server: `pnpm dev` → localhost:5173

## Production Deployment
- Frontend: Cloudflare Pages or Vercel (auto-deploy on git push to GitHub)
- Backend: Supabase cloud
- Schema deploy: `supabase db push`
- Frontend deploy: `git push` (CI auto-deploys)
- Production env vars set once in hosting dashboard — never in code

---

## Coding Preferences
- **pnpm** always — never npm
- **`.env.local`** for environment variables
- Components small and single responsibility
- **RLS enabled on every new table** — no exceptions
- **SQL migration files only** — never use Supabase dashboard to edit schema
- shadcn components preferred over building from scratch
- **Mobile-first responsive design** always
- No unnecessary abstractions — build what is needed now

---

## Directory Structure
```
uniform_management/
├── src/
│   ├── components/ui/       # shadcn components (auto-generated)
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client singleton
│   │   └── utils.ts         # Shared utilities
│   ├── pages/               # One file per screen/route
│   └── types/               # TypeScript type definitions
├── supabase/
│   ├── migrations/          # SQL files — committed to git
│   ├── functions/           # Edge functions
│   └── seed.sql             # Test data for local dev
├── docs/                    # Notes, specs, decisions
├── .env.example             # Committed — shows required vars
├── .env.local               # Gitignored — actual local keys
└── CLAUDE.md                # This file
```

---

## Modules

### 1. Uniform / Asset Management — IN PROGRESS
- Define uniform items (type, size, quantity) per branch
- Issue uniform items to staff (barcode scan or manual)
- Return / mark as damaged or lost
- Manager view: who has what, stock levels per branch
- Owner view: cross-branch overview
- Barcode scanning via `html5-qrcode` (camera-based, no hardware needed)

### 2. Inventory Management — planned
### 3. Staff Management — planned

---

## Status
- [x] pnpm installed (v10.33.0)
- [x] React + Vite app scaffolded (react-ts template)
- [x] Tailwind + shadcn configured (slate base, CSS variables)
- [x] PWA configured (vite-plugin-pwa)
- [x] Local Supabase initialised and running
- [x] Supabase client connected (.env.local wired)
- [x] Uniform module schema written (migration + RLS + transition function)
- [x] Seed data added (27 staff, 140 items, 55 transitions from PDF)
- [x] Auth (login) working
- [x] Uniform module UI built (Dashboard, Staff, Scan, Inventory, Settings)
