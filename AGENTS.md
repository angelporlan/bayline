# AGENTS.md — contrato para agentes de IA

Eres un agente que implementa **Bayline**, una demo de software de planta (as-built + test readiness). Este archivo manda sobre cualquier impulso de “hacerlo más espacial” o “añadir IA”.

## Objetivo del producto

Construir una aplicación web en producción que demuestre:

1. Trazabilidad de piezas críticas de una etapa de lanzador **ficticio**.
2. Un **gate de readiness** que bloquea `Ready for test` si faltan ítems, certificados, NCR abiertos o ECO abiertos.
3. Un historial de auditoría inmutable.
4. Un pack exportable (JSON + PDF simple) de la configuración as-built.

El wow no es visual. El wow es: **el botón se niega y explica por qué**.

## No negociable

- Hardware, nombres de vehículo y seriales son ficticios. Prefijo sugerido: `BL-` (Bayline), vehículo `BL-1`, etapas `S1` / `S2`.
- Prohibido usar marcas, logos, nombres de motores reales de terceros, fotos de fábrica ajenas o telemetría presentada como real.
- Prohibido mission control, Three.js de cohete, WebSockets de “lanzamiento”, mapas de Kourou, countdown.
- Prohibido LLM/agente que redacte informes de anomalías en v1.
- Toda regla de negocio vive en el **servidor**. La UI solo muestra el resultado.
- No ampliar el alcance hasta que el MVP de 4 pantallas esté desplegado.

## Alcance MVP (obligatorio)

Cuatro rutas:

1. `/vehicles` — lista de unidades
2. `/vehicles/:id` — árbol as-built + semáforo de readiness
3. `/parts/:id` — ficha de pieza, certificados, historial
4. `/vehicles/:id/pack` — pack as-built exportable

Roles demo (sin IdP): `operator` | `quality` | `engineering`. Selector en header basta.

## Stack fijo

No cambies el stack salvo bloqueo técnico:

- `apps/web`: Vite + React + TypeScript
- `apps/api`: Node + TypeScript + Hono (preferido) o Express
- Prisma + PostgreSQL
- Tailwind + componentes simples (sin librería de design system pesada)
- Seed en `prisma/seed.ts`

Monorepo opcional. Si simplifica, un solo paquete `apps/web` con API routes no. Preferir API y web separados, o un único servidor que sirva API + estáticos. Elige **un** layout y documentarlo en `docs/12-stack.md` si lo cambias.

## Cómo implementar

Sigue `docs/08-ruta-implementacion.md` fase a fase.  
No saltes a PDF, QR o CSV de ensayo hasta cerrar fases 0–4.

Cada fase debe dejar:

- código compilando
- seed reproducible
- README de la fase actualizado si cambia un contrato

## Criterio de “hecho”

MVP hecho cuando:

- [x] Seed crea 2 vehículos, 2 etapas, ~12 piezas, 1 NCR abierto, 1 ECO abierto, 1 certificado faltante
- [x] Una etapa **no** puede pasar a `READY_FOR_TEST`
- [x] Tras cerrar NCR, aplicar ECO y adjuntar certificado, **sí** puede
- [x] Cada transición escribe `AuditEvent`
- [x] Demo desplegada con banner `FICTIONAL DEMO DATA`
- [x] README del repo explica en 8 líneas qué es y qué no es

## Estilo de código

- TypeScript strict
- Nombres en inglés en código; copy de UI en español
- IDs: UUID
- Enums Prisma para estados
- Validación Zod en API
- Sin `any`
- Commits pequeños por fase: `feat(phase-2): part state machine`

## Si el usuario pide “efecto wow extra”

Añade solo **después** del MVP, y solo uno:

- CSV de campaña de banco **simulado** (30 s, 3 canales) ligado a una etapa ya `READY_FOR_TEST`

Nada más.
