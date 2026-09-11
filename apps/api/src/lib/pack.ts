import type { Prisma } from "@prisma/client";
import { evaluateStageReadiness } from "./readiness";
import { snapshotFromStage, type LoadedStage } from "./stage-snapshot";
import { buildSimplePdf } from "./pdf";

type VehiclePackSource = Prisma.VehicleGetPayload<{
  include: {
    ecos: true;
    stages: {
      include: {
        positions: {
          include: { installedPart: { include: { certificates: true } } };
        };
        ncrs: true;
        auditEvents: true;
        vehicle: { include: { ecos: true } };
      };
    };
  };
}>;

export function buildPackPayload(vehicle: VehiclePackSource) {
  const stages = vehicle.stages.map((stage) => {
    const loaded = stage as LoadedStage;
    const readiness = evaluateStageReadiness(snapshotFromStage(loaded));
    return {
      id: stage.id,
      code: stage.code,
      name: stage.name,
      status: stage.status,
      readiness,
      asBuilt: stage.positions.map((p) => ({
        position: p.code,
        title: p.title,
        requiredPn: p.requiredPn,
        requiredRevision: p.requiredRevision,
        critical: p.critical,
        serial: p.installedPart?.serial ?? null,
        partRevision: p.installedPart?.revision ?? null,
        partStatus: p.installedPart?.status ?? null,
        supplier: p.installedPart?.supplier ?? null,
        certificates:
          p.installedPart?.certificates.map((c) => ({
            type: c.type,
            title: c.title,
            issuedAt: c.issuedAt.toISOString(),
          })) ?? [],
      })),
      ncrs: stage.ncrs.map((n) => ({
        code: n.code,
        title: n.title,
        status: n.status,
        detail: n.detail,
      })),
    };
  });

  const auditEvents = vehicle.stages
    .flatMap((s) =>
      s.auditEvents.map((e) => ({
        id: e.id,
        stageCode: s.code,
        partId: e.partId,
        actorRole: e.actorRole,
        actorName: e.actorName,
        action: e.action,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    disclaimer:
      "DATOS DE DEMOSTRACIÓN — HARDWARE FICTICIO — NO AFILIADO A NINGÚN OPERADOR",
    generatedAt: new Date().toISOString(),
    vehicle: {
      id: vehicle.id,
      code: vehicle.code,
      name: vehicle.name,
      program: vehicle.program,
      status: vehicle.status,
    },
    ecos: vehicle.ecos.map((e) => ({
      code: e.code,
      title: e.title,
      status: e.status,
      affectsPn: e.affectsPn,
      newRevision: e.newRevision,
    })),
    stages,
    auditEvents,
  };
}

export type PackPayload = ReturnType<typeof buildPackPayload>;

export function packToPdf(pack: PackPayload): Uint8Array {
  const lines: string[] = [
    "BAYLINE — PACK AS-BUILT",
    pack.disclaimer,
    "",
    `Vehículo: ${pack.vehicle.code}  ${pack.vehicle.name}`,
    `Programa: ${pack.vehicle.program}`,
    `Estado:   ${pack.vehicle.status}`,
    `Generado: ${pack.generatedAt}`,
    "",
  ];

  for (const stage of pack.stages) {
    lines.push(`== Etapa ${stage.code} ${stage.name}  [${stage.status}]`);
    lines.push(
      `   Ready: ${stage.readiness.canMarkReady ? "SÍ" : "NO"}  bloqueos: ${stage.readiness.blockers.length}`,
    );
    for (const b of stage.readiness.blockers) {
      lines.push(`   - ${b.code}  ${b.message}`);
    }
    lines.push("   As-built:");
    for (const row of stage.asBuilt) {
      lines.push(
        `   ${row.position}  PN ${row.requiredPn}@${row.requiredRevision}  SN ${row.serial ?? "—"}  rev ${row.partRevision ?? "—"}  ${row.partStatus ?? "VACÍA"}`,
      );
    }
    if (stage.ncrs.length > 0) {
      lines.push("   NCR:");
      for (const n of stage.ncrs) {
        lines.push(`   ${n.code} [${n.status}] ${n.title}`);
      }
    }
    lines.push("");
  }

  if (pack.ecos.length > 0) {
    lines.push("ECOs del vehículo:");
    for (const e of pack.ecos) {
      lines.push(
        `  ${e.code} [${e.status}] ${e.affectsPn} → rev ${e.newRevision}  ${e.title}`,
      );
    }
    lines.push("");
  }

  lines.push(`Eventos de auditoría: ${pack.auditEvents.length}`);
  for (const e of pack.auditEvents.slice(-40)) {
    lines.push(`  ${e.createdAt}  ${e.action}  ${e.actorRole}  etapa ${e.stageCode}`);
  }

  return buildSimplePdf(`${pack.vehicle.code} as-built`, lines);
}
