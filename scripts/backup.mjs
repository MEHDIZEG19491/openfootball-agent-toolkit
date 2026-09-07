import { DatabaseSync, backup } from "node:sqlite";
import { existsSync } from "node:fs";
import { mkdir, chmod, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
if (existsSync(".env")) process.loadEnvFile(".env");
const source = resolve(process.env.DATABASE_PATH || "data/openfootball.sqlite");
if (!existsSync(source))
  throw new Error("Database not found. Start the application first.");
const target = resolve(
  process.argv[2] ||
    `private/backups/openfootball-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
);
if (source === target || existsSync(target))
  throw new Error("Choose a new backup path; existing files are never overwritten.");
await mkdir(dirname(target), { recursive: true, mode: 0o700 });
// Reserve the target with restricted permissions before SQLite writes bytes.
const { open } = await import("node:fs/promises");
const file = await open(target, "wx", 0o600);
await file.close();
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, target);
  await chmod(target, 0o600);
  const copy = new DatabaseSync(target, { readOnly: true });
  try {
    if (copy.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("Backup integrity check failed.");
  } finally {
    copy.close();
  }
  console.log(`Verified backup: ${target}`);
} catch (error) {
  await unlink(target);
  throw error;
} finally {
  db.close();
}
