import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function writeAudit(input: {
  stageId?: string | null;
  partId?: string | null;
  actorRole: string;
  actorName: string;
  action: AuditAction;
  payload: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      stageId: input.stageId ?? null,
      partId: input.partId ?? null,
      actorRole: input.actorRole,
      actorName: input.actorName,
      action: input.action,
      payload: input.payload,
    },
  });
}
