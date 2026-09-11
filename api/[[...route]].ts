export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

type FetchApp = {
  fetch: (request: Request, env?: unknown, ctx?: unknown) => Promise<Response>;
};

export default async function handler(
  request: Request,
): Promise<Response> {
  const mod = (await import("../apps/api/src/app.js")) as { app: FetchApp };
  return mod.app.fetch(request);
}
