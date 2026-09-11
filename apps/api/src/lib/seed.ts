import { randomUUID } from "node:crypto";
import { type PartStatus, type PrismaClient } from "@prisma/client";

const ISSUED = new Date("2026-03-15T00:00:00.000Z");
const PROGRAM = "Bayline Orbital Demonstrator";

type PartRow = {
  id: string;
  pn: string;
  serial: string;
  lot: string;
  revision: string;
  supplier: string;
  status: PartStatus;
  certs: { type: string; title: string }[];
};

function part(
  pn: string,
  serial: string,
  lot: string,
  revision: string,
  supplier: string,
  status: PartStatus,
  certs: { type: string; title: string }[] = [],
): PartRow {
  return {
    id: randomUUID(),
    pn,
    serial,
    lot,
    revision,
    supplier,
    status,
    certs,
  };
}

async function reset(prisma: PrismaClient): Promise<void> {
  await prisma.auditEvent.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.ncr.deleteMany();
  await prisma.eco.deleteMany();
  await prisma.position.deleteMany();
  await prisma.part.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.vehicle.deleteMany();
}

async function insertParts(
  prisma: PrismaClient,
  rows: PartRow[],
): Promise<void> {
  await prisma.part.createMany({
    data: rows.map(({ certs: _c, ...row }) => row),
  });
  const certs = rows.flatMap((row) =>
    row.certs.map((c) => ({
      partId: row.id,
      type: c.type,
      title: c.title,
      issuedAt: ISSUED,
      dummyUrl: "/demo/certs/placeholder.txt",
    })),
  );
  if (certs.length > 0) {
    await prisma.certificate.createMany({ data: certs });
  }
}

export async function seedBayline(prisma: PrismaClient): Promise<{
  vehicles: number;
  parts: number;
  ncrs: number;
  ecos: number;
}> {
  await reset(prisma);

  const dm1 = await prisma.vehicle.create({
    data: {
      code: "BL-1-DM1",
      name: "Demostrador 1",
      program: PROGRAM,
      status: "READY_FOR_TEST",
      stages: {
        create: [
          { code: "S1", name: "Etapa 1", status: "READY_FOR_TEST" },
          { code: "S2", name: "Etapa 2", status: "READY_FOR_TEST" },
        ],
      },
    },
    include: { stages: true },
  });
  const dm2 = await prisma.vehicle.create({
    data: {
      code: "BL-1-DM2",
      name: "Demostrador 2",
      program: PROGRAM,
      status: "BLOCKED",
      stages: {
        create: [
          { code: "S1", name: "Etapa 1", status: "READY_FOR_TEST" },
          { code: "S2", name: "Etapa 2", status: "BLOCKED" },
        ],
      },
    },
    include: { stages: true },
  });

  const dm1s1 = dm1.stages.find((s) => s.code === "S1");
  const dm1s2 = dm1.stages.find((s) => s.code === "S2");
  const dm2s1 = dm2.stages.find((s) => s.code === "S1");
  const dm2s2 = dm2.stages.find((s) => s.code === "S2");
  if (!dm1s1 || !dm1s2 || !dm2s1 || !dm2s2) {
    throw new Error("seed stages missing");
  }

  const dm1S1 = [
    part("PN-TANK-S1", "SN-T1-1001", "LOT-T1-01", "B", "North Bay Forging", "INSTALLED", [
      { type: "NDT", title: "NDT tanque S1" },
    ]),
    part("PN-FEED-S1", "SN-FD-1001", "LOT-FD-01", "A", "Iberian Valves Demo", "INSTALLED", [
      { type: "COC", title: "COC alimentación S1" },
    ]),
    part("PN-STRUCT-S1", "SN-ST-1001", "LOT-ST-01", "A", "North Bay Forging", "INSTALLED", [
      { type: "NDT", title: "NDT estructura S1" },
    ]),
    part("PN-HARNESS-S1", "SN-H1-1001", "LOT-H1-01", "A", "Coastal Composites Demo", "INSTALLED", [
      { type: "COC", title: "COC arnés S1" },
    ]),
  ];
  const dm2S1 = [
    part("PN-TANK-S1", "SN-T1-2101", "LOT-T1-01", "B", "North Bay Forging", "INSTALLED", [
      { type: "NDT", title: "NDT tanque S1" },
    ]),
    part("PN-FEED-S1", "SN-FD-2101", "LOT-FD-01", "A", "Iberian Valves Demo", "INSTALLED", [
      { type: "COC", title: "COC alimentación S1" },
    ]),
    part("PN-STRUCT-S1", "SN-ST-2101", "LOT-ST-01", "A", "North Bay Forging", "INSTALLED", [
      { type: "NDT", title: "NDT estructura S1" },
    ]),
    part("PN-HARNESS-S1", "SN-H1-2101", "LOT-H1-01", "A", "Coastal Composites Demo", "INSTALLED", [
      { type: "COC", title: "COC arnés S1" },
    ]),
  ];
  const dm1S2 = [
    part("PN-TANK-S2", "SN-T2-1001", "LOT-T2-10", "B", "North Bay Forging", "INSTALLED", [
      { type: "NDT", title: "NDT tanque S2 DM1" },
    ]),
    part("PN-VALVE-LOX", "SN-VL-2001", "LOT-VL-20", "C", "Iberian Valves Demo", "INSTALLED", [
      { type: "COC", title: "COC válvula LOX DM1" },
    ]),
    part("PN-VALVE-RP1", "SN-VK-2008", "LOT-VK-20", "C", "Iberian Valves Demo", "INSTALLED", [
      { type: "COC", title: "COC válvula RP-1 DM1" },
    ]),
    part("PN-ACT-TVCA", "SN-AC-3011", "LOT-AC-30", "A", "Coastal Composites Demo", "INSTALLED", [
      { type: "NDT", title: "NDT actuador TVCA DM1" },
    ]),
    part("PN-HARNESS-A", "SN-HA-4102", "LOT-HA-41", "A", "Coastal Composites Demo", "INSTALLED", [
      { type: "COC", title: "COC arnés A DM1" },
    ]),
    part("PN-HE-BOTTLE", "SN-HE-1188", "LOT-HE-11", "B", "North Bay Forging", "INSTALLED", [
      { type: "MATERIAL", title: "Certificado de material He DM1" },
      { type: "NDT", title: "NDT botella He DM1" },
    ]),
  ];
  const dm2Tank = part("PN-TANK-S2", "SN-T2-2101", "LOT-T2-21", "B", "North Bay Forging", "INSTALLED", [
    { type: "NDT", title: "NDT tanque S2 DM2" },
  ]);
  const dm2LoxSpare = part("PN-VALVE-LOX", "SN-VL-2104", "LOT-VL-21", "C", "Iberian Valves Demo", "NDT_OK", [
    { type: "NDT", title: "NDT válvula LOX SN-VL-2104" },
  ]);
  const dm2Rp1 = part("PN-VALVE-RP1", "SN-VK-2100", "LOT-VK-21", "B", "Iberian Valves Demo", "INSTALLED", [
    { type: "COC", title: "COC válvula RP-1 rev B" },
  ]);
  const dm2Rp1Spare = part("PN-VALVE-RP1", "SN-VK-2105", "LOT-VK-21", "C", "Iberian Valves Demo", "NDT_OK", [
    { type: "COC", title: "COC válvula RP-1 rev C" },
  ]);
  const dm2Act = part("PN-ACT-TVCA", "SN-AC-3110", "LOT-AC-31", "A", "Coastal Composites Demo", "INSPECTED");
  const dm2Harness = part("PN-HARNESS-A", "SN-HA-4200", "LOT-HA-42", "A", "Coastal Composites Demo", "INSTALLED");
  const dm2He = part("PN-HE-BOTTLE", "SN-HE-2188", "LOT-HE-21", "B", "North Bay Forging", "INSTALLED", [
    { type: "NDT", title: "NDT botella He DM2" },
  ]);

  const allParts = [
    ...dm1S1,
    ...dm2S1,
    ...dm1S2,
    dm2Tank,
    dm2LoxSpare,
    dm2Rp1,
    dm2Rp1Spare,
    dm2Act,
    dm2Harness,
    dm2He,
  ];
  await insertParts(prisma, allParts);

  const s1Map = (stageId: string, rows: PartRow[]) => [
    {
      stageId,
      code: "S1.TANK",
      title: "Tanque de etapa 1",
      requiredPn: "PN-TANK-S1",
      requiredRevision: "B",
      critical: true,
      installedPartId: rows[0]!.id,
    },
    {
      stageId,
      code: "S1.FEED.MAIN",
      title: "Alimentación principal S1",
      requiredPn: "PN-FEED-S1",
      requiredRevision: "A",
      critical: true,
      installedPartId: rows[1]!.id,
    },
    {
      stageId,
      code: "S1.STRUCT.AFT",
      title: "Estructura de popa S1",
      requiredPn: "PN-STRUCT-S1",
      requiredRevision: "A",
      critical: true,
      installedPartId: rows[2]!.id,
    },
    {
      stageId,
      code: "S1.HARNESS",
      title: "Arnés de etapa 1",
      requiredPn: "PN-HARNESS-S1",
      requiredRevision: "A",
      critical: true,
      installedPartId: rows[3]!.id,
    },
  ];

  await prisma.position.createMany({
    data: [
      ...s1Map(dm1s1.id, dm1S1),
      ...s1Map(dm2s1.id, dm2S1),
      {
        stageId: dm1s2.id,
        code: "S2.TANK",
        title: "Tanque de etapa 2",
        requiredPn: "PN-TANK-S2",
        requiredRevision: "B",
        critical: true,
        installedPartId: dm1S2[0]!.id,
      },
      {
        stageId: dm1s2.id,
        code: "S2.FEED.LOX.VALVE-A",
        title: "Válvula LOX de alimentación",
        requiredPn: "PN-VALVE-LOX",
        requiredRevision: "C",
        critical: true,
        installedPartId: dm1S2[1]!.id,
      },
      {
        stageId: dm1s2.id,
        code: "S2.FEED.RP1.VALVE-A",
        title: "Válvula RP-1 de alimentación",
        requiredPn: "PN-VALVE-RP1",
        requiredRevision: "C",
        critical: true,
        installedPartId: dm1S2[2]!.id,
      },
      {
        stageId: dm1s2.id,
        code: "S2.ACT.TVCA",
        title: "Actuador TVCA",
        requiredPn: "PN-ACT-TVCA",
        requiredRevision: "A",
        critical: true,
        installedPartId: dm1S2[3]!.id,
      },
      {
        stageId: dm1s2.id,
        code: "S2.HARNESS-A",
        title: "Arnés de potencia A",
        requiredPn: "PN-HARNESS-A",
        requiredRevision: "A",
        critical: true,
        installedPartId: dm1S2[4]!.id,
      },
      {
        stageId: dm1s2.id,
        code: "S2.HE.BOTTLE",
        title: "Botella de helio",
        requiredPn: "PN-HE-BOTTLE",
        requiredRevision: "B",
        critical: true,
        installedPartId: dm1S2[5]!.id,
      },
      {
        stageId: dm2s2.id,
        code: "S2.TANK",
        title: "Tanque de etapa 2",
        requiredPn: "PN-TANK-S2",
        requiredRevision: "B",
        critical: true,
        installedPartId: dm2Tank.id,
      },
      {
        stageId: dm2s2.id,
        code: "S2.FEED.LOX.VALVE-A",
        title: "Válvula LOX de alimentación",
        requiredPn: "PN-VALVE-LOX",
        requiredRevision: "C",
        critical: true,
        installedPartId: null,
      },
      {
        stageId: dm2s2.id,
        code: "S2.FEED.RP1.VALVE-A",
        title: "Válvula RP-1 de alimentación",
        requiredPn: "PN-VALVE-RP1",
        requiredRevision: "C",
        critical: true,
        installedPartId: dm2Rp1.id,
      },
      {
        stageId: dm2s2.id,
        code: "S2.ACT.TVCA",
        title: "Actuador TVCA",
        requiredPn: "PN-ACT-TVCA",
        requiredRevision: "A",
        critical: true,
        installedPartId: dm2Act.id,
      },
      {
        stageId: dm2s2.id,
        code: "S2.HARNESS-A",
        title: "Arnés de potencia A",
        requiredPn: "PN-HARNESS-A",
        requiredRevision: "A",
        critical: true,
        installedPartId: dm2Harness.id,
      },
      {
        stageId: dm2s2.id,
        code: "S2.HE.BOTTLE",
        title: "Botella de helio",
        requiredPn: "PN-HE-BOTTLE",
        requiredRevision: "B",
        critical: true,
        installedPartId: dm2He.id,
      },
    ],
  });

  await prisma.ncr.create({
    data: {
      stageId: dm2s2.id,
      partId: dm2He.id,
      code: "NCR-007",
      title: "Porosidad en soldadura de soporte",
      detail:
        "Porosidad en soldadura de soporte de botella de helio. Contención pendiente de cierre de calidad.",
      status: "OPEN",
    },
  });
  await prisma.eco.create({
    data: {
      vehicleId: dm2.id,
      code: "ECO-014",
      title: "Válvula RP-1 a revisión C",
      detail:
        "Actualizar válvula RP-1 de revisión B a C por cambio de asiento. Afecta PN-VALVE-RP1.",
      affectsPn: "PN-VALVE-RP1",
      newRevision: "C",
      status: "OPEN",
    },
  });
  await prisma.auditEvent.create({
    data: {
      stageId: dm1s2.id,
      actorRole: "quality",
      actorName: "Calidad demo",
      action: "READINESS_PASSED",
      payload: {
        before: { status: "IN_BUILD" },
        after: { status: "READY_FOR_TEST" },
        note: "Seed: DM1 S2 lista para ensayo",
      },
    },
  });

  return {
    vehicles: await prisma.vehicle.count(),
    parts: await prisma.part.count(),
    ncrs: await prisma.ncr.count(),
    ecos: await prisma.eco.count(),
  };
}

