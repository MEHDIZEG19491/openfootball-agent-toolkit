export function publicSourcePath(path) {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) return false;
  if (
    normalized
      .split("/")
      .some((part) =>
        [
          "node_modules",
          ".next",
          ".git",
          "data",
          "private",
          "release",
          "coverage",
          ".test-output",
        ].includes(part),
      )
  )
    return false;
  const name = normalized.split("/").at(-1);
  if (
    name === "OPENAI-OSS-APPLICATION.md" ||
    name === "PRIVATE-OPENAI-OSS-APPLICATION.md"
  )
    return false;
  if (name?.startsWith(".env") && name !== ".env.example") return false;
  return !/\.(?:sqlite|db)(?:-|$)|\.log$|\.tsbuildinfo$|\.(?:pem|key|p12|pfx)$/i.test(
    name ?? "",
  );
}
