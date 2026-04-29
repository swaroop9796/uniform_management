# Restaurant Management SaaS

## Local Development

### Prerequisites
- Node.js v18+
- pnpm (`brew install pnpm`)
- Docker Desktop (running)
- Supabase CLI (`brew install supabase/tap/supabase`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (runs in Docker)
supabase start

# 3. Copy env template and fill in values from `supabase status`
cp .env.example .env.local

# 4. Apply schema and seed data
supabase db reset

# 5. Start the dev server
pnpm dev
```

Local Supabase dashboard: http://localhost:54323

---

## Deploying to Production

### First-time setup (one-off)
1. Create a project on [supabase.com](https://supabase.com)
2. Connect this repo to [Cloudflare Pages](https://pages.cloudflare.com)
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Cloudflare Pages env vars

### Ongoing deploys

```bash
# Push schema changes to Supabase cloud
supabase db push

# Deploy frontend — just push to GitHub, Cloudflare auto-deploys
git push
```
