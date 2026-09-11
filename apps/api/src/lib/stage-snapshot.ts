import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  evaluateStageReadiness,
  rollupVehicleStatus,
  type StageSnapshot,
  type VehicleStatusValue,
} from "./readiness";

export const stageReadinessInclude = {
  positions: {
    include: { installedPart: { include: { certificates: true } } },
    orderBy: { code: "asc" as const },
  },
  ncrs: true,
  vehicle: { include: { ecos: true } },
} satisfies Prisma.StageInclude;

export type LoadedStage = Prisma.StageGetPayload<{
  include: typeof stageReadinessInclude;
}>;

export function snapshotFromStage(stage: LoadedStage): StageSnapshot {
  return {
    id: stage.id,
    status: stage.status,
    positions: stage.positions.map((position) => ({
      code: position.code,
      critical: position.critical,
      requiredPn: position.requiredPn,
      requiredRevision: position.requiredRevision,
      installedPart: position.installedPart
        ? {
            id: position.installedPart.id,
            pn: position.installedPart.pn,
            serial: position.installedPart.serial,
            revision: position.installedPart.revision,
            status: position.installedPart.status,
            certificates: position.installedPart.certificates.map((c) => ({
              type: c.type,
            })),
          }
        : null,
    })),
    ncrs: stage.ncrs.map((ncr) => ({
      code: ncr.code,
      status: ncr.status,
      partId: ncr.partId,
    })),
    ecos: stage.vehicle.ecos.map((eco) => ({
      code: eco.code,
      status: eco.status,
      affectsPn: eco.affectsPn,
    })),
  };
}

export async function loadStageSnapshot(
  stageId: string,
): Promise<LoadedStage | null> {
  return prisma.stage.findUnique({
    where: { id: stageId },
    include: stageReadinessInclude,
  });
}

export async function evaluateStageById(stageId: string) {
  const stage = await loadStageSnapshot(stageId);
  if (!stage) return null;
  return {
    stage,
    result: evaluateStageReadiness(snapshotFromStage(stage)),
  };
}

export async function syncStageStatus(
  stageId: string,
  evaluatedStatus: VehicleStatusValue,
  canMarkReady: boolean,
): Promise<VehicleStatusValue> {
  const persisted: VehicleStatusValue = canMarkReady
    ? evaluatedStatus === "BLOCKED"
      ? "IN_BUILD"
      : evaluatedStatus
    : "BLOCKED";

  const current = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!current) return persisted;

  if (current.status === "READY_FOR_TEST" && canMarkReady) {
    return "READY_FOR_TEST";
  }
  if (current.status === "IN_TEST" || current.status === "COMPLETE") {
    return current.status;
  }

  if (current.status !== persisted) {
    await prisma.stage.update({
      where: { id: stageId },
      data: { status: persisted },
    });
  }
  return persisted;
}

export async function syncVehicleStatus(vehicleId: string): Promise<void> {
  const stages = await prisma.stage.findMany({ where: { vehicleId } });
  const status = rollupVehicleStatus(stages.map((s) => s.status));
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { status } });
}
