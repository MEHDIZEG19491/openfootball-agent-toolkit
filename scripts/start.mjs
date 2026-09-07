import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
if (existsSync(".env")) process.loadEnvFile(".env");
if (!existsSync(".next/standalone/server.js"))
  throw new Error("Run npm run build first.");
const server = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_PATH: resolve(process.env.DATABASE_PATH || "data/openfootball.sqlite"),
    HOSTNAME: process.env.HOSTNAME_BIND || "127.0.0.1",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 1));
