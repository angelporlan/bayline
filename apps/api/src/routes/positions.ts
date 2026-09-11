import { Hono } from "hono";
import { z } from "zod";
import type { DemoRole } from "../lib/demo-role";
import { hasRole } from "../lib/demo-role";
import { prisma } from "../lib/prisma";
import { writeAudit } from "../lib/audit";
import { serializePart } from "../lib/serialize";
import { syncVehicleStatus } from "../lib/stage-snapshot";

type Vars = { role: DemoRole; actorName: string };

export const positionRoutes = new Hono<{ Variables: Vars }>();

const installBody = z.object({
  partId: z.string().uuid(),
});

positionRoutes.post("/positions/:id/install", async (c) => {
  const positionId = c.req.param("id");
  const role = c.get("role");
  if (!hasRole(role, ["operator", "quality"])) {
    return c.json(
      { error: "FORBIDDEN", message: "Requiere rol operator o quality" },
      403,
    );
  }
  const parsed = installBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "VALIDATION", issues: parsed.error.flatten() }, 400);
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: { installedPart: true, stage: true },
  });
  if (!position) return c.json({ error: "NOT_FOUND" }, 404);

  if (position.installedPartId) {
    return c.json(
      {
        error: "POSITION_OCCUPIED",
        message: "La posición ya tiene una pieza instalada",
      },
      409,
    );
  }

  const part = await prisma.part.findUnique({
    where: { id: parsed.data.partId },
    include: { position: true, certificates: true },
  });
  if (!part) return c.json({ error: "NOT_FOUND" }, 404);

  if (part.position) {
    return c.json(
      {
        error: "PART_ALREADY_INSTALLED",
        message: "La pieza ya está en otra posición",
      },
      409,
    );
  }

  if (part.pn !== position.requiredPn) {
    return c.json(
      {
        error: "PN_MISMATCH",
        message: `PN ${part.pn} no coincide con ${position.requiredPn}`,
      },
      409,
    );
  }

  if (part.revision !== position.requiredRevision) {
    return c.json(
      {
        error: "REVISION_MISMATCH",
        message: `Revisión ${part.revision} distinta de la requerida ${position.requiredRevision}`,
      },
      409,
    );
  }

  if (part.status !== "NDT_OK") {
    return c.json(
      {
        error: "PART_NOT_NDT_OK",
        message: "Solo se instala una pieza en estado NDT_OK",
      },
      409,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const pos = await tx.position.update({
      where: { id: positionId },
      data: { installedPartId: part.id },
    });
    const installed = await tx.part.update({
      where: { id: part.id },
      data: { status: "INSTALLED" },
      include: { certificates: true, ncrs: true },
    });
    return { pos, installed };
  });

  await writeAudit({
    stageId: position.stageId,
    partId: part.id,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "PART_INSTALLED",
    payload: {
      before: { position: position.code, installedPartId: null, partStatus: part.status },
      after: {
        position: position.code,
        installedPartId: part.id,
        partStatus: "INSTALLED",
        serial: part.serial,
      },
    },
  });

  await syncVehicleStatus(position.stage.vehicleId);

  return c.json({
    positionId,
    part: serializePart(updated.installed),
  });
});

positionRoutes.post("/positions/:id/remove", async (c) => {
  const positionId = c.req.param("id");
  const role = c.get("role");
  if (!hasRole(role, ["operator", "quality"])) {
    return c.json(
      { error: "FORBIDDEN", message: "Requiere rol operator o quality" },
      403,
    );
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: { installedPart: true, stage: true },
  });
  if (!position) return c.json({ error: "NOT_FOUND" }, 404);
  if (!position.installedPart || !position.installedPartId) {
    return c.json(
      { error: "POSITION_EMPTY", message: "La posición ya está vacía" },
      409,
    );
  }

  const partId = position.installedPartId;
  const beforeStatus = position.installedPart.status;

  const removed = await prisma.$transaction(async (tx) => {
    await tx.position.update({
      where: { id: positionId },
      data: { installedPartId: null },
    });
    return tx.part.update({
      where: { id: partId },
      data: { status: "NDT_OK" },
      include: { certificates: true, ncrs: true },
    });
  });

  await writeAudit({
    stageId: position.stageId,
    partId,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "PART_REMOVED",
    payload: {
      before: {
        position: position.code,
        installedPartId: partId,
        partStatus: beforeStatus,
      },
      after: {
        position: position.code,
        installedPartId: null,
        partStatus: "NDT_OK",
      },
    },
  });

  await syncVehicleStatus(position.stage.vehicleId);

  return c.json({
    positionId,
    part: serializePart(removed),
  });
});
