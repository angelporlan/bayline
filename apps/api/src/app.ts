import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { actorName, parseRole, type DemoRole } from "./lib/demo-role";
import { healthRoutes } from "./routes/health";
import { vehicleRoutes } from "./routes/vehicles";
import { partRoutes } from "./routes/parts";
import { positionRoutes } from "./routes/positions";
import { ncrRoutes } from "./routes/ncrs";
import { ecoRoutes } from "./routes/ecos";
import { demoRoutes } from "./routes/demo";

export type AppVars = {
  role: DemoRole;
  actorName: string;
};

export const app = new Hono<{ Variables: AppVars }>();

app.use("*", cors());
app.use("*", logger());
app.use("/api/*", async (c, next) => {
  const role = parseRole(c.req.header("X-Demo-Role"));
  c.set("role", role);
  c.set("actorName", actorName(role));
  await next();
});

const api = new Hono<{ Variables: AppVars }>();
api.route("/", healthRoutes);
api.route("/", vehicleRoutes);
api.route("/", partRoutes);
api.route("/", positionRoutes);
api.route("/", ncrRoutes);
api.route("/", ecoRoutes);
api.route("/", demoRoutes);

app.route("/api", api);

app.notFound((c) => c.json({ error: "NOT_FOUND" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "INTERNAL", message: err.message }, 500);
});
