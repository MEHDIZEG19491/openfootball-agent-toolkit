import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { publicSourcePath } from "./release-policy.mjs";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version))
  throw new Error("Release version must be semantic x.y.z.");
if (process.env.RELEASE_VERSION && process.env.RELEASE_VERSION !== pkg.version)
  throw new Error("Requested version differs from package.json.");
if (git("status", "--porcelain", "--untracked-files=normal"))
  throw new Error("Commit reviewed public source before preparing the archive.");
const files = git("ls-tree", "-r", "--name-only", "HEAD").split("\n");
const forbidden = files.filter((p) => !publicSourcePath(p));
if (forbidden.length)
  throw new Error(
    "Private/runtime files are tracked. Remove them before release: " +
      forbidden.join(", "),
  );
const modes = git("ls-tree", "-r", "HEAD").split("\n");
if (modes.some((row) => !/^100(?:644|755) /.test(row)))
  throw new Error("Release source must contain regular files only.");
for (const file of [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "GOVERNANCE.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "ARCHITECTURE.md",
  "package-lock.json",
  "docs/QUALITY-AUDIT.md",
])
  if (!files.includes(file)) throw new Error("Missing required release file: " + file);
mkdirSync("release", { recursive: true });
const filename = `openfootball-agent-toolkit-v${pkg.version}.zip`;
execFileSync("git", [
  "archive",
  "--format=zip",
  "--prefix=openfootball-agent-toolkit/",
  "--output=release/" + filename,
  "HEAD",
]);
const sha256 = createHash("sha256")
  .update(readFileSync("release/" + filename))
  .digest("hex");
writeFileSync("release/SHA256SUMS", sha256 + "  " + filename + "\n");
writeFileSync(
  "release/SOURCE-MANIFEST.json",
  JSON.stringify(
    {
      version: pkg.version,
      commit: git("rev-parse", "HEAD"),
      archive: filename,
      sha256,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${filename} from ${git("rev-parse", "--short", "HEAD")}; ${files.length} public files. Nothing was published.`,
);
