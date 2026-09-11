import { Hono } from "hono";
import type { DemoRole } from "../lib/demo-role";
import { prisma } from "../lib/prisma";
import { writeAudit } from "../lib/audit";
import { serializeEco, serializeStage } from "../lib/serialize";
import {
  evaluateStageById,
  stageReadinessInclude,
  syncStageStatus,
  syncVehicleStatus,
} from "../lib/stage-snapshot";
import { buildPackPayload, packToPdf } from "../lib/pack";

type Vars = { role: DemoRole; actorName: string };

export const vehicleRoutes = new Hono<{ Variables: Vars }>();

const vehicleListInclude = {
  stages: {
    include: stageReadinessInclude,
    orderBy: { code: "asc" as const },
  },
  ecos: true,
};

vehicleRoutes.get("/vehicles", async (c) => {
  const vehicles = await prisma.vehicle.findMany({
    include: vehicleListInclude,
    orderBy: { code: "asc" },
  });

  const items = vehicles.map((v) => {
    const stages = v.stages.map(serializeStage);
    const critical = stages.find((s) => s.code === "S2") ?? stages[0];
    const lastStageUpdate = v.stages.reduce(
      (max, s) => (s.updatedAt > max ? s.updatedAt : max),
      v.updatedAt,
    );
    return {
      id: v.id,
      code: v.code,
      name: v.name,
      program: v.program,
      status: v.status,
      updatedAt: lastStageUpdate,
      criticalStage: critical
        ? {
            id: critical.id,
            code: critical.code,
            status: critical.status,
            canMarkReady: critical.readiness.canMarkReady,
            blockerCount: critical.readiness.blockers.length,
          }
        : null,
      stages: stages.map((s) => ({
        id: s.id,
        code: s.code,
        status: s.status,
        canMarkReady: s.readiness.canMarkReady,
        blockerCount: s.readiness.blockers.length,
      })),
    };
  });

  return c.json({ vehicles: items });
});

vehicleRoutes.get("/vehicles/:id", async (c) => {
  const id = c.req.param("id");
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: vehicleListInclude,
  });
  if (!vehicle) return c.json({ error: "NOT_FOUND" }, 404);

  const availableParts = await prisma.part.findMany({
    where: {
      status: { notIn: ["SCRAPPED", "INSTALLED"] },
      position: null,
    },
    include: { certificates: true, ncrs: true },
    orderBy: { serial: "asc" },
  });

  return c.json({
    id: vehicle.id,
    code: vehicle.code,
    name: vehicle.name,
    program: vehicle.program,
    status: vehicle.status,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
    stages: vehicle.stages.map(serializeStage),
    ecos: vehicle.ecos.map(serializeEco),
    availableParts: availableParts.map((p) => ({
      id: p.id,
      pn: p.pn,
      serial: p.serial,
      lot: p.lot,
      revision: p.revision,
      supplier: p.supplier,
      status: p.status,
      certificates: p.certificates,
    })),
  });
});

vehicleRoutes.get("/vehicles/:id/readiness", async (c) => {
  const id = c.req.param("id");
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      stages: { include: stageReadinessInclude, orderBy: { code: "asc" } },
    },
  });
  if (!vehicle) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json({
    vehicleId: vehicle.id,
    status: vehicle.status,
    stages: vehicle.stages.map(serializeStage).map((s) => ({
      ...s.readiness,
      stageId: s.id,
      code: s.code,
    })),
  });
});

vehicleRoutes.post("/vehicles/:id/stages/:stageId/evaluate", async (c) => {
  const vehicleId = c.req.param("id");
  const stageId = c.req.param("stageId");
  const evaluated = await evaluateStageById(stageId);
  if (!evaluated || evaluated.stage.vehicleId !== vehicleId) {
    return c.json({ error: "NOT_FOUND" }, 404);
  }

  const persistedStatus = await syncStageStatus(
    stageId,
    evaluated.result.status,
    evaluated.result.canMarkReady,
  );
  await syncVehicleStatus(vehicleId);

  await writeAudit({
    stageId,
    actorRole: c.get("role"),
    actorName: c.get("actorName"),
    action: "READINESS_EVALUATED",
    payload: {
      before: { status: evaluated.stage.status },
      after: { status: persistedStatus, canMarkReady: evaluated.result.canMarkReady },
      blockers: evaluated.result.blockers,
    },
  });

  return c.json({
    ...evaluated.result,
    status: persistedStatus,
  });
});

vehicleRoutes.post("/vehicles/:id/stages/:stageId/mark-ready", async (c) => {
  const vehicleId = c.req.param("id");
  const stageId = c.req.param("stageId");
  const evaluated = await evaluateStageById(stageId);
  if (!evaluated || evaluated.stage.vehicleId !== vehicleId) {
    return c.json({ error: "NOT_FOUND" }, 404);
  }

  if (!evaluated.result.canMarkReady) {
    await writeAudit({
      stageId,
      actorRole: c.get("role"),
      actorName: c.get("actorName"),
      action: "READINESS_BLOCKED",
      payload: {
        before: { status: evaluated.stage.status },
        after: { status: evaluated.stage.status },
        blockers: evaluated.result.blockers,
      },
    });
    await syncStageStatus(stageId, "BLOCKED", false);
    await syncVehicleStatus(vehicleId);
    return c.json(
      {
        error: "READINESS_BLOCKED",
        blockers: evaluated.result.blockers,
        canMarkReady: false,
        stageId,
        status: "BLOCKED" as const,
      },
      409,
    );
  }

  const before = evaluated.stage.status;
  await prisma.stage.update({
    where: { id: stageId },
    data: { status: "READY_FOR_TEST" },
  });
  await syncVehicleStatus(vehicleId);

  await writeAudit({
    stageId,
    actorRole: c.get("role"),
    actorName: c.get("actorName"),
    action: "READINESS_PASSED",
    payload: {
      before: { status: before },
      after: { status: "READY_FOR_TEST" },
      blockers: [],
    },
  });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

  return c.json({
    stageId,
    status: "READY_FOR_TEST",
    canMarkReady: true,
    blockers: [],
    vehicleStatus: vehicle?.status ?? null,
  });
});

const packInclude = {
  ecos: true,
  stages: {
    include: {
      positions: {
        include: { installedPart: { include: { certificates: true } } },
        orderBy: { code: "asc" as const },
      },
      ncrs: true,
      auditEvents: { orderBy: { createdAt: "asc" as const } },
      vehicle: { include: { ecos: true } },
    },
    orderBy: { code: "asc" as const },
  },
};

vehicleRoutes.get("/vehicles/:id/pack", async (c) => {
  const id = c.req.param("id");
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: packInclude,
  });
  if (!vehicle) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(buildPackPayload(vehicle));
});

vehicleRoutes.get("/vehicles/:id/pack.pdf", async (c) => {
  const id = c.req.param("id");
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: packInclude,
  });
  if (!vehicle) return c.json({ error: "NOT_FOUND" }, 404);
  const pack = buildPackPayload(vehicle);
  const pdf = packToPdf(pack);
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${vehicle.code}-asbuilt.pdf"`,
    },
  });
});
