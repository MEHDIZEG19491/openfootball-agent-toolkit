import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { Repository, openDatabase } from "../src/server/database";
import { ruleSchema } from "../src/core/schemas";
// @ts-expect-error Small runtime policy module intentionally has no TS build step.
import { publicSourcePath } from "../scripts/release-policy.mjs";
test("online backup preserves committed WAL data, passes integrity and refuses overwrites", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "ofat-backup-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, "source.sqlite"),
    target = join(dir, "snapshot.sqlite");
  const repo = new Repository(openDatabase(source));
  t.after(() => repo.db.close());
  const p = repo.create("players", { name: "Fictional Backup Player" }, "test");
  const script = resolve("scripts/backup.mjs");
  const run = () =>
    execFileSync(process.execPath, [script, target], {
      cwd: dir,
      env: { ...process.env, DATABASE_PATH: source },
      stdio: ["ignore", "pipe", "pipe"],
    });
  assert.match(run().toString(), /Verified backup/);
  assert.equal(statSync(target).mode & 0o777, 0o600);
  const copy = new Repository(new DatabaseSync(target, { readOnly: true }));
  try {
    assert.equal(copy.get("players", p.id)?.name, p.name);
    assert.equal(copy.db.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok");
  } finally {
    copy.db.close();
  }
  assert.throws(run);
});
test("release path policy rejects private material and runtime state", () => {
  for (const path of [
    ".env",
    ".env.production",
    "data/roster.sqlite",
    "private/backups/a.sqlite",
    "docs/OPENAI-OSS-APPLICATION.md",
    "node_modules/pkg/index.js",
    "/etc/passwd",
    "../secret",
    "secrets/private.key",
  ])
    assert.equal(publicSourcePath(path), false, path);
  for (const path of [
    ".env.example",
    "README.md",
    "src/core/matching.ts",
    "docs/community/starter-issues.json",
  ])
    assert.equal(publicSourcePath(path), true, path);
});
test("starter issues are substantive, uniquely identified and use known labels/milestones", () => {
  const p = JSON.parse(readFileSync("docs/community/starter-issues.json", "utf8"));
  assert.ok(p.issues.length >= 15);
  const ids = new Set();
  for (const issue of p.issues) {
    assert.ok(!ids.has(issue.id));
    ids.add(issue.id);
    assert.match(issue.body, /Acceptance criteria/);
    assert.ok(issue.body.length > 250);
    assert.ok(p.milestones.some((m: { title: string }) => m.title === issue.milestone));
    assert.ok(
      issue.labels.every((label: string) =>
        p.labels.some((l: { name: string }) => l.name === label),
      ),
    );
  }
});
test("bundled rule pack is valid, fictional and unverified", () => {
  const packs = JSON.parse(
    readFileSync("rule-packs/examples/fictional-training.json", "utf8"),
  );
  for (const pack of packs) {
    const parsed = ruleSchema.parse(pack);
    assert.equal(parsed.verificationStatus, "UNVERIFIED");
    assert.match(String(parsed.name), /FICTIONAL/);
  }
});
