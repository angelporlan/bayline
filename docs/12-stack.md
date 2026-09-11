# 12 — Stack y estructura de carpetas

```
bayline/
  AGENTS.md
  README.md
  vercel.json
  api/[[...route]].ts   # función Vercel → Hono
  apps/
    web/                # Vite React TS + Tailwind
    api/                # Hono + Prisma + Zod + Vitest
  package.json          # npm workspaces
```

En local: API en `:3001` (`tsx`) y web en `:5173` (proxy `/api` → API).

En producción: un solo proyecto Vercel sirve el estático de `apps/web/dist` y reescribe `/api/*` a la función Node que monta el mismo `app` de Hono. Postgres sigue en Supabase (`DATABASE_URL` pooler + `DIRECT_URL` sesión).

## Scripts

```
dev / dev:api / dev:web
build
test
db:migrate / db:push / db:seed
```

## Variables

Ver `.env.example`. En Vercel: `DATABASE_URL`, `DIRECT_URL`, `DEMO_RESET_TOKEN`.
