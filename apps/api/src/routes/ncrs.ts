import { Hono } from "hono";
import { z } from "zod";
import type { DemoRole } from "../lib/demo-role";
import { hasRole } from "../lib/demo-role";
import { prisma } from "../lib/prisma";
import { writeAudit } from "../lib/audit";
import { serializeNcr } from "../lib/serialize";
import { syncVehicleStatus } from "../lib/stage-snapshot";

type Vars = { role: DemoRole; actorName: string };

export const ncrRoutes = new Hono<{ Variables: Vars }>();

const openBody = z.object({
  stageId: z.string().uuid(),
  partId: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
});

ncrRoutes.post("/ncrs", async (c) => {
  const role = c.get("role");
  if (!hasRole(role, ["quality"])) {
    return c.json({ error: "FORBIDDEN", message: "Requiere rol quality" }, 403);
  }
  const parsed = openBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "VALIDATION", issues: parsed.error.flatten() }, 400);
  }

  const stage = await prisma.stage.findUnique({
    where: { id: parsed.data.stageId },
  });
  if (!stage) return c.json({ error: "NOT_FOUND" }, 404);

  if (parsed.data.partId) {
    const part = await prisma.part.findUnique({
      where: { id: parsed.data.partId },
    });
    if (!part) return c.json({ error: "NOT_FOUND" }, 404);
  }

  const existing = await prisma.ncr.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return c.json({ error: "DUPLICATE", message: "Código NCR ya existe" }, 409);
  }

  const ncr = await prisma.ncr.create({
    data: {
      stageId: parsed.data.stageId,
      partId: parsed.data.partId ?? null,
      code: parsed.data.code,
      title: parsed.data.title,
      detail: parsed.data.detail,
      status: "OPEN",
    },
  });

  await writeAudit({
    stageId: ncr.stageId,
    partId: ncr.partId,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "NCR_OPENED",
    payload: {
      before: { status: null },
      after: { id: ncr.id, code: ncr.code, status: ncr.status },
    },
  });

  await syncVehicleStatus(stage.vehicleId);
  return c.json(serializeNcr(ncr), 201);
});

ncrRoutes.post("/ncrs/:id/close", async (c) => {
  const role = c.get("role");
  if (!hasRole(role, ["quality"])) {
    return c.json({ error: "FORBIDDEN", message: "Requiere rol quality" }, 403);
  }
  const id = c.req.param("id");
  const ncr = await prisma.ncr.findUnique({
    where: { id },
    include: { stage: true },
  });
  if (!ncr) return c.json({ error: "NOT_FOUND" }, 404);
  if (ncr.status === "CLOSED") {
    return c.json({ error: "ALREADY_CLOSED", message: "NCR ya cerrado" }, 409);
  }

  const updated = await prisma.ncr.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await writeAudit({
    stageId: ncr.stageId,
    partId: ncr.partId,
    actorRole: role,
    actorName: c.get("actorName"),
    action: "NCR_CLOSED",
    payload: {
      before: { status: ncr.status, closedAt: ncr.closedAt },
      after: { status: "CLOSED", closedAt: updated.closedAt },
      code: ncr.code,
    },
  });

  await syncVehicleStatus(ncr.stage.vehicleId);
  return c.json(serializeNcr(updated));
});
