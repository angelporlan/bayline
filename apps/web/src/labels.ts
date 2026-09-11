import type { PartStatus, VehicleStatus } from "./types";

export const VEHICLE_STATUS: Record<VehicleStatus, string> = {
  IN_BUILD: "En fabricación",
  BLOCKED: "Bloqueada",
  READY_FOR_TEST: "Lista para ensayo",
  IN_TEST: "En ensayo",
  COMPLETE: "Completa",
};

export const PART_STATUS: Record<PartStatus, string> = {
  RECEIVED: "Recibida",
  INSPECTED: "Inspeccionada",
  NDT_OK: "NDT OK",
  INSTALLED: "Instalada",
  BLOCKED: "Bloqueada",
  SCRAPPED: "Desechada",
};

export const ROLE_LABEL = {
  operator: "Operador",
  quality: "Calidad",
  engineering: "Ingeniería",
} as const;

export const ACTION_LABEL: Record<string, string> = {
  PART_STATUS_CHANGED: "Cambio de estado",
  PART_INSTALLED: "Pieza instalada",
  PART_REMOVED: "Pieza retirada",
  CERT_ATTACHED: "Certificado adjunto",
  NCR_OPENED: "NCR abierto",
  NCR_CLOSED: "NCR cerrado",
  ECO_OPENED: "ECO abierto",
  ECO_CLOSED: "ECO cerrado",
  READINESS_EVALUATED: "Readiness evaluada",
  READINESS_PASSED: "Readiness superada",
  READINESS_BLOCKED: "Readiness bloqueada",
};
