import { Hono } from "hono";
import { prisma } from "../lib/prisma";

export const healthRoutes = new Hono();

healthRoutes.get("/health", async (c) => {
  let db: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }
  const body = {
    ok: db === "up",
    service: "bayline-api",
    time: new Date().toISOString(),
    db,
  };
  return c.json(body, db === "up" ? 200 : 503);
});
