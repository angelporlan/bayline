# Bayline

Demo de **configuración as-built + gate de test readiness** para un lanzador orbital ficticio.

No es un centro de control de misión. No es un clon de PLM. No usa hardware, logos ni datos de ninguna empresa real.

Es una herramienta interna de planta: árbol de ensamblaje, estados de pieza, no conformidades, cambios de ingeniería y una regla dura (en el servidor) que impide declarar una etapa `Ready for test` si falta evidencia.

Todo el hardware, seriales y certificados de este repositorio son **DEMO / FICTIONAL**. Banner: `FICTIONAL DEMO DATA`.

Demo pública: https://bayline-zeta.vercel.app  
Código: https://github.com/angelporlan/bayline

`POST /api/demo/reset` restaura el seed (header `X-Demo-Reset-Token`; el valor vive en Vercel / `.env`, no en el repo).

## Arranque local

```bash
cp .env.example .env   # rellena DATABASE_URL y DIRECT_URL (Postgres)
npm install
npm run db:push        # o npm run db:migrate
npm run db:seed
npm run dev            # API :3001 · web :5173
npm test               # motor evaluateStageReadiness
```

Unidades seed: `BL-1-DM1` (S2 verde) y `BL-1-DM2` (S2 bloqueada). Cierra huecos en DM2 y el servidor deja pasar `READY_FOR_TEST`.

## Para agentes de IA

Lee [`AGENTS.md`](./AGENTS.md) y `docs/08-ruta-implementacion.md`. Stack: `apps/web` Vite React TS, `apps/api` Hono + Prisma + Postgres.
