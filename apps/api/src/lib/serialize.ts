import type { Certificate, Eco, Ncr, Part } from "@prisma/client";
import { evaluateStageReadiness } from "./readiness";
import { snapshotFromStage, type LoadedStage } from "./stage-snapshot";
import { allowedTransitions } from "./part-state";

export function serializePart(
  part: Part & {
    certificates?: Certificate[];
    ncrs?: Ncr[];
  },
) {
  return {
    id: part.id,
    pn: part.pn,
    serial: part.serial,
    lot: part.lot,
    revision: part.revision,
    supplier: part.supplier,
    status: part.status,
    certificates: part.certificates ?? [],
    ncrs: part.ncrs ?? [],
    allowedTransitions: allowedTransitions(part.status),
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
  };
}

export function serializeNcr(ncr: Ncr) {
  return {
    id: ncr.id,
    stageId: ncr.stageId,
    partId: ncr.partId,
    code: ncr.code,
    title: ncr.title,
    detail: ncr.detail,
    status: ncr.status,
    openedAt: ncr.openedAt,
    closedAt: ncr.closedAt,
  };
}

export function serializeEco(eco: Eco) {
  return {
    id: eco.id,
    vehicleId: eco.vehicleId,
    code: eco.code,
    title: eco.title,
    detail: eco.detail,
    affectsPn: eco.affectsPn,
    newRevision: eco.newRevision,
    status: eco.status,
    openedAt: eco.openedAt,
    closedAt: eco.closedAt,
  };
}

export function serializeStage(stage: LoadedStage) {
  const readiness = evaluateStageReadiness(snapshotFromStage(stage));
  return {
    id: stage.id,
    vehicleId: stage.vehicleId,
    code: stage.code,
    name: stage.name,
    status: stage.status,
    readiness,
    positions: stage.positions.map((p) => ({
      id: p.id,
      stageId: p.stageId,
      code: p.code,
      title: p.title,
      requiredPn: p.requiredPn,
      requiredRevision: p.requiredRevision,
      critical: p.critical,
      installedPart: p.installedPart ? serializePart(p.installedPart) : null,
    })),
    ncrs: stage.ncrs.map(serializeNcr),
  };
}
