import { Hono } from "hono";
import { z } from "zod";
import type { PartStatus } from "@prisma/client";
import type { DemoRole } from "../lib/demo-role";
import { hasRole } from "../lib/demo-role";
import { prisma } from "../lib/prisma";
import { writeAudit } from "../lib/audit";
import { canTransition } from "../lib/part-state";
import { serializePart } from "../lib/serialize";
import { syncVehicleStatus } from "../lib/stage-snapshot";

type Vars = { role: DemoRole; actorName: string };

export const partRoutes = new Hono<{ Variables: Vars }>();

const STATUSES = [
  "RECEIVED",
  "INSPECTED",
  "NDT_OK",
  "INSTALLED",
  "BLOCKED",
  "SCRAPPED",
] as const;

const statusBody = z.object({
  status: z.enum(STATUSES),
});

const certBody = z.object({
  type: z.enum(["NDT", "COC", "MATERIAL"]),
  title: z.string().min(1),
  issuedAt: z.string().datetime().optional(),
  dummyUrl: z.string().optional(),
});

partRoutes.get("/parts", async (c) => {
  const pn = c.req.query("pn");
  const available = c.req.query("available");
  const parts = await prisma.part.findMany({
    where: {
      ...(pn ? { pn } : {}),
      ...(available === "true" || available === "1"
        ? { position: null, status: { notIn: ["SCRAPPED", "INSTALLED"] } }
        : {}),
    },
    include: { certificates: true, ncrs: true, position: true },
    orderBy: { serial: "asc" },
  });
  return c.json({ parts: parts.map(serializePart) });
});

partRoutes.get("/parts/:id", async (c) => {
  const id = c.req.param("id");
  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      certificates: { orderBy: { issuedAt: "desc" } },
      ncrs: { orderBy: { openedAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
      position: {
        include: {
          stage: { include: { vehicle: true } },
        },
      },
    },
  });
  if (!part) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json({
    ...serializePart(part),
    position: part.position
      ? {
          id: part.position.id,
          code: part.position.code,
          title: part.position.title,
          requiredPn: part.position.requiredPn,
          requiredRevision: part.position.requiredRevision,
          stage: {
            id: part.position.stage.id,
            code: part.position.stage.code,
            name: part.position.stage.name,
            vehicle: {
              id: part.position.stage.vehicle.id,
              code: part.position.stage.vehicle.code,
            },
          },
        }
      : null,
    events: part.events,
  });
});

partRoutes.post("/parts/:id/status", async (c) => {
  const id = c.req.param("id");
  const role = c.get("role");
  const parsed = statusBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "VALIDATION", issues: parsed.error.flatten() }, 400);
  }
  const next = parsed.data.status as PartStatus;

  if (next === "SCRAPPED" && !hasRole(role, ["quality"])) {
    return c.json({ error: "FORBIDDEN", message: "Requiere rol quality" }, 403);
  }
  if (next === "BLOCKED" && !hasRole(role, ["quality"])) {
    return c.json({ error: "FORBIDDEN", message: "Requiere rol quality" }, 403);
  }
  if (
    !hasRole(role, ["operator", "quality"]) &&
    next !== "SCRAPPED"
  ) {
    return c.json(
      { error: "FORBIDDEN", message: "Requiere rol operator o quality" },
      403,
    );
  }

  const part = await prisma.part.findUnique({
    where: { id },
    include: { position: { include: { stage: true } } },
  });
  if (!part) return c.json({ error: "NOT_FOUND" }, 404);

  if (!canTransition(part.status, next)) {
    return c.json(
      {
        error: "ILLEGAL_TRANSITION",
        message: `Transición ilegal ${part.status} → ${next}`,
        from: part.status,
        to: next,
      },
      409,
    );
  }

  if (next === "INSTALLED" && !part.position) {
    return c.json(
      {
        error: "NOT_IN_POSITION",
        message: "No se puede marcar INSTALLED fuera de una posición",
      },
      409,
    );
  }

  if (next === "NDT_OK" && part.status === "INSTALLED") {
    return c.json(
      {
        error: "USE_REMOVE",
        message: "Para desinstalar usa el endpoint de posición /remove",
      },
      409,
    );
  }

  const updated = await prisma.part.update({
    where: { id },
    data: { status: next },
    include: { certificates: true, ncrs: true },
  });

  await writeAudit({
    stageId: part.position?.stageId ?? null,
    partId: part.id,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "PART_STATUS_CHANGED",
    payload: {
      before: { status: part.status },
      after: { status: next },
      serial: part.serial,
    },
  });

  if (part.position) {
    await syncVehicleStatus(part.position.stage.vehicleId);
  }

  return c.json(serializePart(updated));
});

partRoutes.post("/parts/:id/certificates", async (c) => {
  const id = c.req.param("id");
  const role = c.get("role");
  if (!hasRole(role, ["quality"])) {
    return c.json({ error: "FORBIDDEN", message: "Requiere rol quality" }, 403);
  }
  const parsed = certBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "VALIDATION", issues: parsed.error.flatten() }, 400);
  }

  const part = await prisma.part.findUnique({
    where: { id },
    include: { position: true },
  });
  if (!part) return c.json({ error: "NOT_FOUND" }, 404);

  const cert = await prisma.certificate.create({
    data: {
      partId: id,
      type: parsed.data.type,
      title: parsed.data.title,
      issuedAt: parsed.data.issuedAt
        ? new Date(parsed.data.issuedAt)
        : new Date(),
      dummyUrl: parsed.data.dummyUrl ?? "/demo/certs/placeholder.txt",
    },
  });

  await writeAudit({
    stageId: part.position?.stageId ?? null,
    partId: part.id,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "CERT_ATTACHED",
    payload: {
      before: { certificates: "unchanged" },
      after: { id: cert.id, type: cert.type, title: cert.title },
    },
  });

  return c.json(cert, 201);
});
