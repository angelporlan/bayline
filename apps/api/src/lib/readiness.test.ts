import { describe, expect, it } from "vitest";
import {
  evaluateStageReadiness,
  type SnapshotPart,
  type SnapshotPosition,
  type StageSnapshot,
} from "./readiness";

const TANK_PART: SnapshotPart = {
  id: "part-tank",
  pn: "PN-TANK-S2",
  serial: "SN-T2-1001",
  revision: "B",
  status: "INSTALLED",
  certificates: [{ type: "NDT" }],
};

function position(over: Partial<SnapshotPosition> = {}): SnapshotPosition {
  return {
    code: "S2.TANK",
    critical: true,
    requiredPn: "PN-TANK-S2",
    requiredRevision: "B",
    installedPart: { ...TANK_PART },
    ...over,
  };
}

function snapshot(over: Partial<StageSnapshot> = {}): StageSnapshot {
  return {
    id: "stage-s2",
    status: "IN_BUILD",
    positions: [position()],
    ncrs: [],
    ecos: [],
    ...over,
  };
}

function codesOf(result: ReturnType<typeof evaluateStageReadiness>): string[] {
  return result.blockers.map((b) => b.code);
}

describe("evaluateStageReadiness", () => {
  it("returns canMarkReady with empty blockers when all rules pass", () => {
    const result = evaluateStageReadiness(snapshot());
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.stageId).toBe("stage-s2");
    expect(result.status).toBe("IN_BUILD");
  });

  it("keeps READY_FOR_TEST when the snapshot is already marked and still clear", () => {
    const result = evaluateStageReadiness(
      snapshot({ status: "READY_FOR_TEST" }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.status).toBe("READY_FOR_TEST");
    expect(result.blockers).toEqual([]);
  });

  it("emits MISSING_CRITICAL_PART for an empty critical position", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            code: "S2.FEED.LOX.VALVE-A",
            requiredPn: "PN-VALVE-LOX",
            requiredRevision: "C",
            installedPart: null,
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toContain("MISSING_CRITICAL_PART");
    expect(result.blockers[0]?.positionCode).toBe("S2.FEED.LOX.VALVE-A");
    expect(result.blockers[0]?.message).toBe(
      "Posición crítica sin S/N instalado",
    );
    expect(result.status).toBe("BLOCKED");
  });

  it("does not block an empty non-critical position", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position(),
          position({
            code: "S2.BRACKET.NONCRIT",
            critical: false,
            requiredPn: "PN-BRACKET",
            requiredRevision: "A",
            installedPart: null,
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("emits PART_NOT_NDT_OK when installed part is not NDT_OK or INSTALLED", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            code: "S2.ACT.TVCA",
            requiredPn: "PN-ACT-TVCA",
            requiredRevision: "A",
            installedPart: {
              id: "part-act",
              pn: "PN-ACT-TVCA",
              serial: "SN-AC-3110",
              revision: "A",
              status: "INSPECTED",
              certificates: [{ type: "NDT" }],
            },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["PART_NOT_NDT_OK"]);
    expect(result.blockers[0]?.partSerial).toBe("SN-AC-3110");
  });

  it("accepts NDT_OK as a ready part status", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            installedPart: { ...TANK_PART, status: "NDT_OK" },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("emits PART_BLOCKED for a BLOCKED part and does not also emit PART_NOT_NDT_OK", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            installedPart: {
              ...TANK_PART,
              status: "BLOCKED",
              certificates: [{ type: "COC" }],
            },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["PART_BLOCKED"]);
  });

  it("emits OPEN_NCR for NCR OPEN", () => {
    const result = evaluateStageReadiness(
      snapshot({
        ncrs: [{ code: "NCR-007", status: "OPEN", partId: "part-he" }],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toContain("OPEN_NCR");
    expect(result.blockers.find((b) => b.code === "OPEN_NCR")?.ncrCode).toBe(
      "NCR-007",
    );
  });

  it("emits OPEN_NCR for NCR CONTAINED", () => {
    const result = evaluateStageReadiness(
      snapshot({
        ncrs: [{ code: "NCR-008", status: "CONTAINED", partId: null }],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["OPEN_NCR"]);
  });

  it("ignores CLOSED NCR", () => {
    const result = evaluateStageReadiness(
      snapshot({
        ncrs: [{ code: "NCR-001", status: "CLOSED", partId: null }],
      }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("emits OPEN_ECO when an OPEN ECO affects a PN on the stage", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            code: "S2.FEED.RP1.VALVE-A",
            requiredPn: "PN-VALVE-RP1",
            requiredRevision: "C",
            installedPart: {
              id: "part-rp1",
              pn: "PN-VALVE-RP1",
              serial: "SN-VK-2100",
              revision: "C",
              status: "INSTALLED",
              certificates: [{ type: "COC" }],
            },
          }),
        ],
        ecos: [
          {
            code: "ECO-014",
            status: "OPEN",
            affectsPn: "PN-VALVE-RP1",
          },
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["OPEN_ECO"]);
    expect(result.blockers[0]?.ecoCode).toBe("ECO-014");
  });

  it("ignores OPEN ECO that does not affect this stage", () => {
    const result = evaluateStageReadiness(
      snapshot({
        ecos: [
          { code: "ECO-099", status: "OPEN", affectsPn: "PN-OTHER" },
        ],
      }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("ignores CLOSED and IMPLEMENTED ECOs", () => {
    const result = evaluateStageReadiness(
      snapshot({
        ecos: [
          { code: "ECO-001", status: "CLOSED", affectsPn: "PN-TANK-S2" },
          { code: "ECO-002", status: "IMPLEMENTED", affectsPn: "PN-TANK-S2" },
        ],
      }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("emits REVISION_MISMATCH when installed revision differs from required", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            code: "S2.FEED.RP1.VALVE-A",
            requiredPn: "PN-VALVE-RP1",
            requiredRevision: "C",
            installedPart: {
              id: "part-rp1",
              pn: "PN-VALVE-RP1",
              serial: "SN-VK-2100",
              revision: "B",
              status: "INSTALLED",
              certificates: [{ type: "COC" }],
            },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["REVISION_MISMATCH"]);
  });

  it("emits MISSING_CERTIFICATE when there is no NDT or COC", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            code: "S2.HARNESS-A",
            requiredPn: "PN-HARNESS-A",
            requiredRevision: "A",
            installedPart: {
              id: "part-harness",
              pn: "PN-HARNESS-A",
              serial: "SN-HA-4200",
              revision: "A",
              status: "INSTALLED",
              certificates: [],
            },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["MISSING_CERTIFICATE"]);
  });

  it("does not accept MATERIAL-only certificates as NDT/COC evidence", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            installedPart: {
              ...TANK_PART,
              certificates: [{ type: "MATERIAL" }],
            },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(false);
    expect(codesOf(result)).toEqual(["MISSING_CERTIFICATE"]);
  });

  it("accepts COC as evidence certificate", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            installedPart: {
              ...TANK_PART,
              certificates: [{ type: "COC" }],
            },
          }),
        ],
      }),
    );
    expect(result.canMarkReady).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("collects the stacked DM2-style gaps without dropping codes", () => {
    const result = evaluateStageReadiness(
      snapshot({
        positions: [
          position({
            code: "S2.TANK",
            installedPart: { ...TANK_PART, serial: "SN-T2-2101" },
          }),
          position({
            code: "S2.FEED.LOX.VALVE-A",
            requiredPn: "PN-VALVE-LOX",
            requiredRevision: "C",
            installedPart: null,
          }),
          position({
            code: "S2.FEED.RP1.VALVE-A",
            requiredPn: "PN-VALVE-RP1",
            requiredRevision: "C",
            installedPart: {
              id: "part-rp1",
              pn: "PN-VALVE-RP1",
              serial: "SN-VK-2100",
              revision: "B",
              status: "INSTALLED",
              certificates: [{ type: "COC" }],
            },
          }),
          position({
            code: "S2.ACT.TVCA",
            requiredPn: "PN-ACT-TVCA",
            requiredRevision: "A",
            installedPart: {
              id: "part-act",
              pn: "PN-ACT-TVCA",
              serial: "SN-AC-3110",
              revision: "A",
              status: "INSPECTED",
              certificates: [],
            },
          }),
          position({
            code: "S2.HARNESS-A",
            requiredPn: "PN-HARNESS-A",
            requiredRevision: "A",
            installedPart: {
              id: "part-harness",
              pn: "PN-HARNESS-A",
              serial: "SN-HA-4200",
              revision: "A",
              status: "INSTALLED",
              certificates: [],
            },
          }),
          position({
            code: "S2.HE.BOTTLE",
            requiredPn: "PN-HE-BOTTLE",
            requiredRevision: "B",
            installedPart: {
              id: "part-he",
              pn: "PN-HE-BOTTLE",
              serial: "SN-HE-2188",
              revision: "B",
              status: "INSTALLED",
              certificates: [{ type: "NDT" }],
            },
          }),
        ],
        ncrs: [{ code: "NCR-007", status: "OPEN", partId: "part-he" }],
        ecos: [
          { code: "ECO-014", status: "OPEN", affectsPn: "PN-VALVE-RP1" },
        ],
      }),
    );

    expect(result.canMarkReady).toBe(false);
    expect(new Set(codesOf(result))).toEqual(
      new Set([
        "MISSING_CRITICAL_PART",
        "REVISION_MISMATCH",
        "PART_NOT_NDT_OK",
        "MISSING_CERTIFICATE",
        "OPEN_NCR",
        "OPEN_ECO",
      ]),
    );
  });
});
