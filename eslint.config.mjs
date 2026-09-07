import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { compatibleConfig } from "./scripts/eslint-compat.mjs";

export default defineConfig([
  ...nextVitals.map(compatibleConfig),
  ...nextTs.map(compatibleConfig),
  globalIgnores([
    ".next/**",
    "release/**",
    ".test-output/**",
    "next-env.d.ts",
    "dist/**",
  ]),
]);
