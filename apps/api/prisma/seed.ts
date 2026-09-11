import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PrismaClient,
  type PartStatus,
  type VehicleStatus,
} from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env"), quiet: true });
config({ path: resolve(here, "../.env"), quiet: true });

const prisma = new PrismaClient();

const ISSUED = new Date("2026-03-15T00:00:00.000Z");
const PROGRAM = "Bayline Orbital Demonstrator";

type PartInput = {
  pn: string;
  serial: string;
  lot: string;
  revision: string;
  supplier: string;
  status: PartStatus;
  certs?: { type: string; title: string }[];
};

async function reset(): Promise<void> {
  await prisma.auditEvent.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.ncr.deleteMany();
  await prisma.eco.deleteMany();
  await prisma.position.deleteMany();
  await prisma.part.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.vehicle.deleteMany();
}

async function createPart(input: PartInput) {
  const part = await prisma.part.create({
    data: {
      pn: input.pn,
      serial: input.serial,
      lot: input.lot,
      revision: input.revision,
      supplier: input.supplier,
      status: input.status,
    },
  });
  for (const cert of input.certs ?? []) {
    await prisma.certificate.create({
      data: {
        partId: part.id,
        type: cert.type,
        title: cert.title,
        issuedAt: ISSUED,
        dummyUrl: "/demo/certs/placeholder.txt",
      },
    });
  }
  return part;
}

async function createPosition(input: {
  stageId: string;
  code: string;
  title: string;
  requiredPn: string;
  requiredRevision: string;
  partId?: string | null;
}) {
  return prisma.position.create({
    data: {
      stageId: input.stageId,
      code: input.code,
      title: input.title,
      requiredPn: input.requiredPn,
      requiredRevision: input.requiredRevision,
      critical: true,
      installedPartId: input.partId ?? null,
    },
  });
}

async function seedVehicle(input: {
  code: string;
  name: string;
  status: VehicleStatus;
  s1Status: VehicleStatus;
  s2Status: VehicleStatus;
}) {
  return prisma.vehicle.create({
    data: {
      code: input.code,
      name: input.name,
      program: PROGRAM,
      status: input.status,
      stages: {
        create: [
          { code: "S1", name: "Etapa 1", status: input.s1Status },
          { code: "S2", name: "Etapa 2", status: input.s2Status },
        ],
      },
    },
    include: { stages: true },
  });
}

async function seedS1(
  stageId: string,
  serials: {
    tank: string;
    feed: string;
    struct: string;
    harness: string;
  },
) {
  const tank = await createPart({
    pn: "PN-TANK-S1",
    serial: serials.tank,
    lot: "LOT-T1-01",
    revision: "B",
    supplier: "North Bay Forging",
    status: "INSTALLED",
    certs: [{ type: "NDT", title: "NDT tanque S1" }],
  });
  const feed = await createPart({
    pn: "PN-FEED-S1",
    serial: serials.feed,
    lot: "LOT-FD-01",
    revision: "A",
    supplier: "Iberian Valves Demo",
    status: "INSTALLED",
    certs: [{ type: "COC", title: "COC alimentación S1" }],
  });
  const struct = await createPart({
    pn: "PN-STRUCT-S1",
    serial: serials.struct,
    lot: "LOT-ST-01",
    revision: "A",
    supplier: "North Bay Forging",
    status: "INSTALLED",
    certs: [{ type: "NDT", title: "NDT estructura S1" }],
  });
  const harness = await createPart({
    pn: "PN-HARNESS-S1",
    serial: serials.harness,
    lot: "LOT-H1-01",
    revision: "A",
    supplier: "Coastal Composites Demo",
    status: "INSTALLED",
    certs: [{ type: "COC", title: "COC arnés S1" }],
  });

  await createPosition({
    stageId,
    code: "S1.TANK",
    title: "Tanque de etapa 1",
    requiredPn: "PN-TANK-S1",
    requiredRevision: "B",
    partId: tank.id,
  });
  await createPosition({
    stageId,
    code: "S1.FEED.MAIN",
    title: "Alimentación principal S1",
    requiredPn: "PN-FEED-S1",
    requiredRevision: "A",
    partId: feed.id,
  });
  await createPosition({
    stageId,
    code: "S1.STRUCT.AFT",
    title: "Estructura de popa S1",
    requiredPn: "PN-STRUCT-S1",
    requiredRevision: "A",
    partId: struct.id,
  });
  await createPosition({
    stageId,
    code: "S1.HARNESS",
    title: "Arnés de etapa 1",
    requiredPn: "PN-HARNESS-S1",
    requiredRevision: "A",
    partId: harness.id,
  });
}

async function seed() {
  await reset();

  const dm1 = await seedVehicle({
    code: "BL-1-DM1",
    name: "Demostrador 1",
    status: "READY_FOR_TEST",
    s1Status: "READY_FOR_TEST",
    s2Status: "READY_FOR_TEST",
  });
  const dm1s1 = dm1.stages.find((s) => s.code === "S1");
  const dm1s2 = dm1.stages.find((s) => s.code === "S2");
  if (!dm1s1 || !dm1s2) throw new Error("DM1 stages missing");

  await seedS1(dm1s1.id, {
    tank: "SN-T1-1001",
    feed: "SN-FD-1001",
    struct: "SN-ST-1001",
    harness: "SN-H1-1001",
  });

  const dm1Tank = await createPart({
    pn: "PN-TANK-S2",
    serial: "SN-T2-1001",
    lot: "LOT-T2-10",
    revision: "B",
    supplier: "North Bay Forging",
    status: "INSTALLED",
    certs: [{ type: "NDT", title: "NDT tanque S2 DM1" }],
  });
  const dm1Lox = await createPart({
    pn: "PN-VALVE-LOX",
    serial: "SN-VL-2001",
    lot: "LOT-VL-20",
    revision: "C",
    supplier: "Iberian Valves Demo",
    status: "INSTALLED",
    certs: [{ type: "COC", title: "COC válvula LOX DM1" }],
  });
  const dm1Rp1 = await createPart({
    pn: "PN-VALVE-RP1",
    serial: "SN-VK-2008",
    lot: "LOT-VK-20",
    revision: "C",
    supplier: "Iberian Valves Demo",
    status: "INSTALLED",
    certs: [{ type: "COC", title: "COC válvula RP-1 DM1" }],
  });
  const dm1Act = await createPart({
    pn: "PN-ACT-TVCA",
    serial: "SN-AC-3011",
    lot: "LOT-AC-30",
    revision: "A",
    supplier: "Coastal Composites Demo",
    status: "INSTALLED",
    certs: [{ type: "NDT", title: "NDT actuador TVCA DM1" }],
  });
  const dm1Harness = await createPart({
    pn: "PN-HARNESS-A",
    serial: "SN-HA-4102",
    lot: "LOT-HA-41",
    revision: "A",
    supplier: "Coastal Composites Demo",
    status: "INSTALLED",
    certs: [{ type: "COC", title: "COC arnés A DM1" }],
  });
  const dm1He = await createPart({
    pn: "PN-HE-BOTTLE",
    serial: "SN-HE-1188",
    lot: "LOT-HE-11",
    revision: "B",
    supplier: "North Bay Forging",
    status: "INSTALLED",
    certs: [
      { type: "MATERIAL", title: "Certificado de material He DM1" },
      { type: "NDT", title: "NDT botella He DM1" },
    ],
  });

  await createPosition({
    stageId: dm1s2.id,
    code: "S2.TANK",
    title: "Tanque de etapa 2",
    requiredPn: "PN-TANK-S2",
    requiredRevision: "B",
    partId: dm1Tank.id,
  });
  await createPosition({
    stageId: dm1s2.id,
    code: "S2.FEED.LOX.VALVE-A",
    title: "Válvula LOX de alimentación",
    requiredPn: "PN-VALVE-LOX",
    requiredRevision: "C",
    partId: dm1Lox.id,
  });
  await createPosition({
    stageId: dm1s2.id,
    code: "S2.FEED.RP1.VALVE-A",
    title: "Válvula RP-1 de alimentación",
    requiredPn: "PN-VALVE-RP1",
    requiredRevision: "C",
    partId: dm1Rp1.id,
  });
  await createPosition({
    stageId: dm1s2.id,
    code: "S2.ACT.TVCA",
    title: "Actuador TVCA",
    requiredPn: "PN-ACT-TVCA",
    requiredRevision: "A",
    partId: dm1Act.id,
  });
  await createPosition({
    stageId: dm1s2.id,
    code: "S2.HARNESS-A",
    title: "Arnés de potencia A",
    requiredPn: "PN-HARNESS-A",
    requiredRevision: "A",
    partId: dm1Harness.id,
  });
  await createPosition({
    stageId: dm1s2.id,
    code: "S2.HE.BOTTLE",
    title: "Botella de helio",
    requiredPn: "PN-HE-BOTTLE",
    requiredRevision: "B",
    partId: dm1He.id,
  });

  const dm2 = await seedVehicle({
    code: "BL-1-DM2",
    name: "Demostrador 2",
    status: "BLOCKED",
    s1Status: "READY_FOR_TEST",
    s2Status: "BLOCKED",
  });
  const dm2s1 = dm2.stages.find((s) => s.code === "S1");
  const dm2s2 = dm2.stages.find((s) => s.code === "S2");
  if (!dm2s1 || !dm2s2) throw new Error("DM2 stages missing");

  await seedS1(dm2s1.id, {
    tank: "SN-T1-2101",
    feed: "SN-FD-2101",
    struct: "SN-ST-2101",
    harness: "SN-H1-2101",
  });

  const dm2Tank = await createPart({
    pn: "PN-TANK-S2",
    serial: "SN-T2-2101",
    lot: "LOT-T2-21",
    revision: "B",
    supplier: "North Bay Forging",
    status: "INSTALLED",
    certs: [{ type: "NDT", title: "NDT tanque S2 DM2" }],
  });
  const dm2LoxSpare = await createPart({
    pn: "PN-VALVE-LOX",
    serial: "SN-VL-2104",
    lot: "LOT-VL-21",
    revision: "C",
    supplier: "Iberian Valves Demo",
    status: "NDT_OK",
    certs: [{ type: "NDT", title: "NDT válvula LOX SN-VL-2104" }],
  });
  const dm2Rp1 = await createPart({
    pn: "PN-VALVE-RP1",
    serial: "SN-VK-2100",
    lot: "LOT-VK-21",
    revision: "B",
    supplier: "Iberian Valves Demo",
    status: "INSTALLED",
    certs: [{ type: "COC", title: "COC válvula RP-1 rev B" }],
  });
  const dm2Rp1Spare = await createPart({
    pn: "PN-VALVE-RP1",
    serial: "SN-VK-2105",
    lot: "LOT-VK-21",
    revision: "C",
    supplier: "Iberian Valves Demo",
    status: "NDT_OK",
    certs: [{ type: "COC", title: "COC válvula RP-1 rev C" }],
  });
  const dm2Act = await createPart({
    pn: "PN-ACT-TVCA",
    serial: "SN-AC-3110",
    lot: "LOT-AC-31",
    revision: "A",
    supplier: "Coastal Composites Demo",
    status: "INSPECTED",
  });
  const dm2Harness = await createPart({
    pn: "PN-HARNESS-A",
    serial: "SN-HA-4200",
    lot: "LOT-HA-42",
    revision: "A",
    supplier: "Coastal Composites Demo",
    status: "INSTALLED",
  });
  const dm2He = await createPart({
    pn: "PN-HE-BOTTLE",
    serial: "SN-HE-2188",
    lot: "LOT-HE-21",
    revision: "B",
    supplier: "North Bay Forging",
    status: "INSTALLED",
    certs: [{ type: "NDT", title: "NDT botella He DM2" }],
  });

  await createPosition({
    stageId: dm2s2.id,
    code: "S2.TANK",
    title: "Tanque de etapa 2",
    requiredPn: "PN-TANK-S2",
    requiredRevision: "B",
    partId: dm2Tank.id,
  });
  await createPosition({
    stageId: dm2s2.id,
    code: "S2.FEED.LOX.VALVE-A",
    title: "Válvula LOX de alimentación",
    requiredPn: "PN-VALVE-LOX",
    requiredRevision: "C",
    partId: null,
  });
  await createPosition({
    stageId: dm2s2.id,
    code: "S2.FEED.RP1.VALVE-A",
    title: "Válvula RP-1 de alimentación",
    requiredPn: "PN-VALVE-RP1",
    requiredRevision: "C",
    partId: dm2Rp1.id,
  });
  await createPosition({
    stageId: dm2s2.id,
    code: "S2.ACT.TVCA",
    title: "Actuador TVCA",
    requiredPn: "PN-ACT-TVCA",
    requiredRevision: "A",
    partId: dm2Act.id,
  });
  await createPosition({
    stageId: dm2s2.id,
    code: "S2.HARNESS-A",
    title: "Arnés de potencia A",
    requiredPn: "PN-HARNESS-A",
    requiredRevision: "A",
    partId: dm2Harness.id,
  });
  await createPosition({
    stageId: dm2s2.id,
    code: "S2.HE.BOTTLE",
    title: "Botella de helio",
    requiredPn: "PN-HE-BOTTLE",
    requiredRevision: "B",
    partId: dm2He.id,
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

  const counts = {
    vehicles: await prisma.vehicle.count(),
    stages: await prisma.stage.count(),
    parts: await prisma.part.count(),
    positions: await prisma.position.count(),
    ncrs: await prisma.ncr.count(),
    ecos: await prisma.eco.count(),
    certificates: await prisma.certificate.count(),
  };

  console.log("Bayline seed OK", {
    ...counts,
    dm1: dm1.code,
    dm2: dm2.code,
    spareLox: dm2LoxSpare.serial,
    spareRp1: dm2Rp1Spare.serial,
  });
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
