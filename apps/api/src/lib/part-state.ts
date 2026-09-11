import type { PartStatus } from "@prisma/client";

export const PART_TRANSITIONS: Record<PartStatus, readonly PartStatus[]> = {
  RECEIVED: ["INSPECTED", "BLOCKED", "SCRAPPED"],
  INSPECTED: ["NDT_OK", "BLOCKED", "SCRAPPED"],
  NDT_OK: ["INSTALLED", "BLOCKED", "SCRAPPED"],
  INSTALLED: ["BLOCKED", "NDT_OK", "SCRAPPED"],
  BLOCKED: ["INSPECTED", "SCRAPPED"],
  SCRAPPED: [],
};

export function canTransition(from: PartStatus, to: PartStatus): boolean {
  return PART_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: PartStatus): PartStatus[] {
  return [...PART_TRANSITIONS[from]];
}
