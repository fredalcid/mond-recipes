import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

const SECRET = process.env.JWT_SECRET ?? "test-secret-for-local-integration-only-0123456789";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const head = b64({ alg: "HS256", typ: "JWT" });
const body = b64({ role: "anon", exp: Math.floor(Date.now() / 1000) + 3600 });
// A signed anon key, like Supabase's publishable key.
const ANON_KEY = `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;

// Runs the real page queries against PostgREST + the test database (see scripts/test-api.sh).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/integration/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.int.test.ts"],
    env: { NEXT_PUBLIC_SUPABASE_URL: process.env.API_URL ?? "http://localhost:3301", NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY },
  },
});
