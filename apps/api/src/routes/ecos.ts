import { Hono } from "hono";
import { z } from "zod";
import type { DemoRole } from "../lib/demo-role";
import { hasRole } from "../lib/demo-role";
import { prisma } from "../lib/prisma";
import { writeAudit } from "../lib/audit";
import { serializeEco } from "../lib/serialize";
import { syncVehicleStatus } from "../lib/stage-snapshot";

type Vars = { role: DemoRole; actorName: string };

export const ecoRoutes = new Hono<{ Variables: Vars }>();

const openBody = z.object({
  vehicleId: z.string().uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  affectsPn: z.string().min(1),
  newRevision: z.string().min(1),
});

ecoRoutes.post("/ecos", async (c) => {
  const role = c.get("role");
  if (!hasRole(role, ["engineering"])) {
    return c.json(
      { error: "FORBIDDEN", message: "Requiere rol engineering" },
      403,
    );
  }
  const parsed = openBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "VALIDATION", issues: parsed.error.flatten() }, 400);
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId },
  });
  if (!vehicle) return c.json({ error: "NOT_FOUND" }, 404);

  const existing = await prisma.eco.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return c.json({ error: "DUPLICATE", message: "Código ECO ya existe" }, 409);
  }

  const eco = await prisma.eco.create({
    data: {
      vehicleId: parsed.data.vehicleId,
      code: parsed.data.code,
      title: parsed.data.title,
      detail: parsed.data.detail,
      affectsPn: parsed.data.affectsPn,
      newRevision: parsed.data.newRevision,
      status: "OPEN",
    },
  });

  const anyStage = await prisma.stage.findFirst({
    where: { vehicleId: vehicle.id },
  });

  await writeAudit({
    stageId: anyStage?.id ?? null,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "ECO_OPENED",
    payload: {
      before: { status: null },
      after: {
        id: eco.id,
        code: eco.code,
        status: eco.status,
        affectsPn: eco.affectsPn,
        newRevision: eco.newRevision,
      },
    },
  });

  await syncVehicleStatus(vehicle.id);
  return c.json(serializeEco(eco), 201);
});

ecoRoutes.post("/ecos/:id/close", async (c) => {
  const role = c.get("role");
  if (!hasRole(role, ["engineering"])) {
    return c.json(
      { error: "FORBIDDEN", message: "Requiere rol engineering" },
      403,
    );
  }
  const id = c.req.param("id");
  const eco = await prisma.eco.findUnique({ where: { id } });
  if (!eco) return c.json({ error: "NOT_FOUND" }, 404);
  if (eco.status === "CLOSED") {
    return c.json({ error: "ALREADY_CLOSED", message: "ECO ya cerrado" }, 409);
  }

  const stages = await prisma.stage.findMany({
    where: { vehicleId: eco.vehicleId },
    select: { id: true },
  });
  const stageIds = stages.map((s) => s.id);

  const updatedPositions = await prisma.$transaction(async (tx) => {
    const positions = await tx.position.findMany({
      where: { stageId: { in: stageIds }, requiredPn: eco.affectsPn },
    });
    await tx.position.updateMany({
      where: { stageId: { in: stageIds }, requiredPn: eco.affectsPn },
      data: { requiredRevision: eco.newRevision },
    });
    const closed = await tx.eco.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return { closed, positions };
  });

  const anyStage = stages[0];
  await writeAudit({
    stageId: anyStage?.id ?? null,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "ECO_CLOSED",
    payload: {
      before: { status: eco.status, requiredRevision: null },
      after: {
        status: "CLOSED",
        requiredRevision: eco.newRevision,
        affectsPn: eco.affectsPn,
        positionsUpdated: updatedPositions.positions.map((p) => p.code),
      },
      code: eco.code,
    },
  });

  await syncVehicleStatus(eco.vehicleId);
  return c.json(serializeEco(updatedPositions.closed));
});
