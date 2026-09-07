import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env already exists; it was not changed.");
} else {
  const token = randomBytes(32).toString("hex");
  writeFileSync(
    ".env",
    `APP_ORIGIN=http://localhost:3000\nDATABASE_PATH=./data/openfootball.sqlite\nBOOTSTRAP_TOKEN=${token}\nCOOKIE_SECURE=false\nNEXT_TELEMETRY_DISABLED=1\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log("Created .env with a random one-time setup token. Keep this file private.");
}
mkdirSync("data", { recursive: true, mode: 0o700 });
console.log(
  "After starting the app, open http://localhost:3000/setup and copy BOOTSTRAP_TOKEN from .env.",
);
