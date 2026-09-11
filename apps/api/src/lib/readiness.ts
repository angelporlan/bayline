export const BLOCKER_CODES = [
  "MISSING_CRITICAL_PART",
  "PART_NOT_NDT_OK",
  "PART_BLOCKED",
  "OPEN_NCR",
  "OPEN_ECO",
  "REVISION_MISMATCH",
  "MISSING_CERTIFICATE",
] as const;

export type BlockerCode = (typeof BLOCKER_CODES)[number];

export type PartStatusValue =
  | "RECEIVED"
  | "INSPECTED"
  | "NDT_OK"
  | "INSTALLED"
  | "BLOCKED"
  | "SCRAPPED";

export type VehicleStatusValue =
  | "IN_BUILD"
  | "BLOCKED"
  | "READY_FOR_TEST"
  | "IN_TEST"
  | "COMPLETE";

export type NcrStatusValue = "OPEN" | "CONTAINED" | "CLOSED";
export type EcoStatusValue = "OPEN" | "IMPLEMENTED" | "CLOSED";

export type SnapshotCertificate = {
  type: string;
};

export type SnapshotPart = {
  id: string;
  pn: string;
  serial: string;
  revision: string;
  status: PartStatusValue;
  certificates: SnapshotCertificate[];
};

export type SnapshotPosition = {
  code: string;
  critical: boolean;
  requiredPn: string;
  requiredRevision: string;
  installedPart: SnapshotPart | null;
};

export type SnapshotNcr = {
  code: string;
  status: NcrStatusValue;
  partId: string | null;
};

export type SnapshotEco = {
  code: string;
  status: EcoStatusValue;
  affectsPn: string;
};

export type StageSnapshot = {
  id: string;
  status: VehicleStatusValue;
  positions: SnapshotPosition[];
  ncrs: SnapshotNcr[];
  ecos: SnapshotEco[];
};

export type ReadinessBlocker = {
  code: BlockerCode;
  message: string;
  positionCode?: string;
  partSerial?: string;
  ncrCode?: string;
  ecoCode?: string;
};

export type ReadinessResult = {
  stageId: string;
  status: VehicleStatusValue;
  canMarkReady: boolean;
  blockers: ReadinessBlocker[];
};

const CERT_TYPES_OK = new Set(["NDT", "COC"]);
const READY_STATUSES = new Set<PartStatusValue>(["NDT_OK", "INSTALLED"]);

function hasEvidenceCert(part: SnapshotPart): boolean {
  return part.certificates.some((c) => CERT_TYPES_OK.has(c.type));
}

/**
 * Server-side authority for stage test-readiness.
 * Pure function over a stage snapshot — no HTTP, no Prisma.
 */
export function evaluateStageReadiness(snapshot: StageSnapshot): ReadinessResult {
  const blockers: ReadinessBlocker[] = [];

  for (const position of snapshot.positions) {
    if (!position.critical) continue;

    const part = position.installedPart;
    if (!part) {
      blockers.push({
        code: "MISSING_CRITICAL_PART",
        positionCode: position.code,
        message: "Posición crítica sin S/N instalado",
      });
      continue;
    }

    if (part.status === "BLOCKED") {
      blockers.push({
        code: "PART_BLOCKED",
        positionCode: position.code,
        partSerial: part.serial,
        message: "Pieza bloqueada",
      });
    } else if (!READY_STATUSES.has(part.status)) {
      blockers.push({
        code: "PART_NOT_NDT_OK",
        positionCode: position.code,
        partSerial: part.serial,
        message: "Pieza instalada sin NDT OK",
      });
    }

    if (part.revision !== position.requiredRevision) {
      blockers.push({
        code: "REVISION_MISMATCH",
        positionCode: position.code,
        partSerial: part.serial,
        message: "Revisión instalada distinta de la requerida",
      });
    }

    if (!hasEvidenceCert(part)) {
      blockers.push({
        code: "MISSING_CERTIFICATE",
        positionCode: position.code,
        partSerial: part.serial,
        message: "Falta certificado NDT o COC",
      });
    }
  }

  for (const ncr of snapshot.ncrs) {
    if (ncr.status === "OPEN" || ncr.status === "CONTAINED") {
      blockers.push({
        code: "OPEN_NCR",
        ncrCode: ncr.code,
        message: "NCR abierto o contenido",
      });
    }
  }

  const stagePns = new Set<string>();
  for (const position of snapshot.positions) {
    stagePns.add(position.requiredPn);
    if (position.installedPart) {
      stagePns.add(position.installedPart.pn);
    }
  }

  for (const eco of snapshot.ecos) {
    if (eco.status === "OPEN" && stagePns.has(eco.affectsPn)) {
      blockers.push({
        code: "OPEN_ECO",
        ecoCode: eco.code,
        message: "ECO abierto que afecta a esta etapa",
      });
    }
  }

  const canMarkReady = blockers.length === 0;
  const status: VehicleStatusValue = canMarkReady
    ? snapshot.status === "BLOCKED"
      ? "IN_BUILD"
      : snapshot.status
    : "BLOCKED";

  return {
    stageId: snapshot.id,
    status,
    canMarkReady,
    blockers,
  };
}

export function rollupVehicleStatus(
  stageStatuses: VehicleStatusValue[],
): VehicleStatusValue {
  if (stageStatuses.length === 0) return "IN_BUILD";
  if (stageStatuses.some((s) => s === "BLOCKED")) return "BLOCKED";
  if (stageStatuses.some((s) => s === "IN_BUILD")) return "IN_BUILD";
  if (stageStatuses.every((s) => s === "COMPLETE")) return "COMPLETE";
  if (stageStatuses.every((s) => s === "IN_TEST" || s === "COMPLETE")) {
    return "IN_TEST";
  }
  if (
    stageStatuses.every(
      (s) => s === "READY_FOR_TEST" || s === "IN_TEST" || s === "COMPLETE",
    )
  ) {
    return "READY_FOR_TEST";
  }
  return "IN_BUILD";
}
