export type DemoRole = "operator" | "quality" | "engineering";

export type VehicleStatus =
  | "IN_BUILD"
  | "BLOCKED"
  | "READY_FOR_TEST"
  | "IN_TEST"
  | "COMPLETE";

export type PartStatus =
  | "RECEIVED"
  | "INSPECTED"
  | "NDT_OK"
  | "INSTALLED"
  | "BLOCKED"
  | "SCRAPPED";

export type BlockerCode =
  | "MISSING_CRITICAL_PART"
  | "PART_NOT_NDT_OK"
  | "PART_BLOCKED"
  | "OPEN_NCR"
  | "OPEN_ECO"
  | "REVISION_MISMATCH"
  | "MISSING_CERTIFICATE";

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
  status: VehicleStatus;
  canMarkReady: boolean;
  blockers: ReadinessBlocker[];
};

export type Certificate = {
  id: string;
  partId: string;
  type: string;
  title: string;
  issuedAt: string;
  dummyUrl?: string | null;
};

export type Ncr = {
  id: string;
  stageId: string;
  partId: string | null;
  code: string;
  title: string;
  detail: string;
  status: "OPEN" | "CONTAINED" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
};

export type Eco = {
  id: string;
  vehicleId: string;
  code: string;
  title: string;
  detail: string;
  affectsPn: string;
  newRevision: string;
  status: "OPEN" | "IMPLEMENTED" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
};

export type PartSummary = {
  id: string;
  pn: string;
  serial: string;
  lot: string;
  revision: string;
  supplier: string;
  status: PartStatus;
  certificates: Certificate[];
  ncrs?: Ncr[];
  allowedTransitions?: PartStatus[];
};

export type PositionRow = {
  id: string;
  stageId: string;
  code: string;
  title: string;
  requiredPn: string;
  requiredRevision: string;
  critical: boolean;
  installedPart: PartSummary | null;
};

export type StageDetail = {
  id: string;
  vehicleId: string;
  code: string;
  name: string;
  status: VehicleStatus;
  readiness: ReadinessResult;
  positions: PositionRow[];
  ncrs: Ncr[];
};

export type VehicleListItem = {
  id: string;
  code: string;
  name: string;
  program: string;
  status: VehicleStatus;
  updatedAt: string;
  criticalStage: {
    id: string;
    code: string;
    status: VehicleStatus;
    canMarkReady: boolean;
    blockerCount: number;
  } | null;
  stages: {
    id: string;
    code: string;
    status: VehicleStatus;
    canMarkReady: boolean;
    blockerCount: number;
  }[];
};

export type VehicleDetail = {
  id: string;
  code: string;
  name: string;
  program: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
  stages: StageDetail[];
  ecos: Eco[];
  availableParts: PartSummary[];
};

export type AuditEvent = {
  id: string;
  stageId: string | null;
  partId: string | null;
  actorRole: string;
  actorName: string;
  action: string;
  payload: unknown;
  createdAt: string;
};

export type PartDetail = PartSummary & {
  position: {
    id: string;
    code: string;
    title: string;
    requiredPn: string;
    requiredRevision: string;
    stage: {
      id: string;
      code: string;
      name: string;
      vehicle: { id: string; code: string };
    };
  } | null;
  events: AuditEvent[];
};

export type PackPayload = {
  disclaimer: string;
  generatedAt: string;
  vehicle: {
    id: string;
    code: string;
    name: string;
    program: string;
    status: VehicleStatus;
  };
  ecos: {
    code: string;
    title: string;
    status: string;
    affectsPn: string;
    newRevision: string;
  }[];
  stages: {
    id: string;
    code: string;
    name: string;
    status: VehicleStatus;
    readiness: ReadinessResult;
    asBuilt: {
      position: string;
      title: string;
      requiredPn: string;
      requiredRevision: string;
      critical: boolean;
      serial: string | null;
      partRevision: string | null;
      partStatus: string | null;
      supplier: string | null;
      certificates: { type: string; title: string; issuedAt: string }[];
    }[];
    ncrs: { code: string; title: string; status: string; detail: string }[];
  }[];
  auditEvents: {
    id: string;
    stageCode: string;
    action: string;
    actorRole: string;
    actorName: string;
    createdAt: string;
  }[];
};
