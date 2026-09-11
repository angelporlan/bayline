import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { seedBayline } from "../src/lib/seed";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env"), quiet: true });
config({ path: resolve(here, "../.env"), quiet: true });

const prisma = new PrismaClient();

seedBayline(prisma)
  .then((counts) => {
    console.log("Bayline seed OK", counts);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
