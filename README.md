# Bayline

Demo de **configuración as-built + gate de test readiness** para fabricación en semiserie de un lanzador orbital ficticio.

No es un centro de control de misión.  
No es un clon de Siemens Teamcenter.  
No usa hardware, logos ni datos de ninguna empresa real.

Es una herramienta interna de planta: árbol de ensamblaje, estados de pieza, no conformidades, cambios de ingeniería y una regla dura que impide declarar una etapa `Ready for test` si falta evidencia.

## Para agentes de IA

Lee en este orden antes de tocar código:

1. [`AGENTS.md`](./AGENTS.md) — contrato de trabajo del agente
2. [`docs/00-contexto.md`](./docs/00-contexto.md)
3. [`docs/03-especificacion.md`](./docs/03-especificacion.md)
4. [`docs/04-modelo-datos.md`](./docs/04-modelo-datos.md)
5. [`docs/08-ruta-implementacion.md`](./docs/08-ruta-implementacion.md)

Si solo puedes leer un archivo, lee `AGENTS.md`.

## Qué construye este repo

| Incluye | No incluye |
| --- | --- |
| Unidades de vehículo y etapas | Telemetría real de vuelo |
| BOM as-built reducido (8–15 ítems críticos) | PLM completo / CAD 3D |
| Estados de pieza + certificados demo | LabVIEW / bancos hardware |
| NCR y ECO abiertos/cerrados | Autenticación empresarial real |
| Gate de readiness con motivos | Cohete 3D / mission control |
| Auditoría inmutable | LLM que “explica anomalías” |
| Pack PDF/JSON as-built | Marca o datos de terceros |

## Stack objetivo

- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript (Hono o Express)
- ORM: Prisma
- DB: PostgreSQL
- Deploy: Vercel (web) + Postgres gestionado (Neon/Supabase)

## Aviso legal

Todo el hardware, seriales, certificados y campañas de este repositorio son **DEMO / FICTIONAL**.  
No afirmar afiliación con ningún operador de lanzamiento.
