import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { evaluateStageReadiness } from "../src/lib/readiness";
import {
  snapshotFromStage,
  stageReadinessInclude,
} from "../src/lib/stage-snapshot";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env"), quiet: true });
config({ path: resolve(here, "../.env"), quiet: true });

const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      stages: { include: stageReadinessInclude, orderBy: { code: "asc" } },
      ecos: true,
    },
    orderBy: { code: "asc" },
  });

  for (const v of vehicles) {
    console.log(
      `VEHICLE ${v.code} status=${v.status} stages=${v.stages.length} ecos=${v.ecos.map((e) => `${e.code}:${e.status}`).join(",") || "-"}`,
    );
    for (const s of v.stages) {
      const result = evaluateStageReadiness(snapshotFromStage(s));
      const empty = s.positions
        .filter((p) => p.critical && !p.installedPart)
        .map((p) => p.code);
      console.log(
        `  STAGE ${s.code} db=${s.status} canMarkReady=${result.canMarkReady} blockers=${result.blockers.map((b) => b.code).join(",") || "(none)"} empty=${empty.join(",") || "-"} ncrs=${s.ncrs.map((n) => `${n.code}:${n.status}`).join(",") || "-"}`,
      );
    }
  }

  const parts = await prisma.part.count();
  console.log(`COUNTS parts=${parts} vehicles=${vehicles.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
