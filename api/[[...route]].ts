import { handle } from "hono/vercel";
import { app } from "../apps/api/src/app";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export default handle(app);
