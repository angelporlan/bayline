import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { seedBayline } from "../lib/seed";
import type { DemoRole } from "../lib/demo-role";

type Vars = { role: DemoRole; actorName: string };

export const demoRoutes = new Hono<{ Variables: Vars }>();

const COOLDOWN_MS = 15_000;
let lastResetAt = 0;

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readToken(c: { req: { header: (n: string) => string | undefined; query: (n: string) => string | undefined } }, body: unknown): string {
  const header = c.req.header("X-Demo-Reset-Token") ?? c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (header && header.length > 0) return header;
  const q = c.req.query("token");
  if (q && q.length > 0) return q;
  if (body && typeof body === "object" && "token" in body && typeof body.token === "string") {
    return body.token;
  }
  return "";
}

demoRoutes.post("/demo/reset", async (c) => {
  const expected = process.env.DEMO_RESET_TOKEN ?? "";
  if (!expected) {
    return c.json(
      { error: "RESET_DISABLED", message: "DEMO_RESET_TOKEN no configurado" },
      503,
    );
  }

  let body: unknown = null;
  const contentType = c.req.header("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await c.req.json();
    } catch {
      body = null;
    }
  }
  const provided = readToken(c, body);
  if (!provided || !tokensMatch(provided, expected)) {
    return c.json({ error: "UNAUTHORIZED" }, 401);
  }

  const now = Date.now();
  if (now - lastResetAt < COOLDOWN_MS) {
    return c.json({ error: "RATE_LIMITED", retryAfterMs: COOLDOWN_MS }, 429);
  }
  lastResetAt = now;

  const counts = await seedBayline(prisma);
  return c.json({ ok: true, counts });
});
