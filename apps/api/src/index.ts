import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env"), quiet: true });
config({ path: resolve(here, "../.env"), quiet: true });

const { app } = await import("./app");

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`bayline-api listening on http://localhost:${info.port}`);
});
