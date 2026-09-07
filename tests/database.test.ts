import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Repository, openDatabase, DomainError } from "../src/server/database";
import { commitImport } from "../src/server/imports";
import { can } from "../src/core/permissions";
import { withoutMeta, fields } from "../src/ui/fields";
import { messages, locales, translator } from "../src/ui/i18n";
import { entities, stages, positions } from "../src/core/types";
test("optimistic updates reject stale versions without losing the newer record", (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const p = repo.create("players", { name: "First Name" }, "test");
  const changed = repo.update("players", p.id, { name: "New Name" }, 1, "test");
  assert.equal(changed.version, 2);
  assert.throws(
    () => repo.update("players", p.id, { name: "Stale Name" }, 1, "test"),
    (e: unknown) => e instanceof DomainError && e.status === 409,
  );
  assert.equal(repo.get("players", p.id)?.name, "New Name");
});
test("linked records cannot be silently orphaned by archiving", (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const club = repo.create("clubs", { name: "Fictional Club", country: "XX" }, "test");
  const p = repo.create("players", { name: "Fictional Player", clubId: club.id }, "test");
  assert.throws(() => repo.archive("clubs", club.id, 1, "test"), /recordInUse/);
  repo.archive("players", p.id, 1, "test");
  repo.archive("clubs", club.id, 1, "test");
  assert.equal(repo.get("clubs", club.id), null);
  assert.equal(repo.list("clubs", true).length, 1);
});
test("imports roll back every record and audit event if a later row fails", (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const id = randomUUID();
  assert.throws(
    () =>
      commitImport(
        repo,
        "players",
        [
          { id, data: { name: "First Example" } },
          { id, data: { name: "Duplicate Example" } },
        ],
        "test",
      ),
    /duplicateRecord/,
  );
  assert.equal(repo.count(), 0);
  assert.equal(repo.db.prepare("SELECT count(*) AS n FROM audit_events").get()!.n, 0);
});
test("pipeline pairs are unique and references must exist", (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const p = repo.create("players", { name: "Fictional Player" }, "test"),
    o = repo.create(
      "opportunities",
      { title: "Fictional Opportunity", country: "XX" },
      "test",
    );
  const data = { playerId: p.id, opportunityId: o.id };
  repo.create("pipeline", data, "test");
  assert.throws(() => repo.create("pipeline", data, "test"), /duplicateRecord/);
  assert.throws(
    () =>
      repo.create(
        "mandates",
        {
          playerId: randomUUID(),
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
        "test",
      ),
    /referenceNotFound/,
  );
});
test("SQL-like names stay ordinary data", (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const p = repo.create("players", { name: "Example'); DROP TABLE records; --" }, "test");
  assert.equal(repo.get("players", p.id)?.name, p.name);
  assert.equal(repo.count(), 1);
});
test("the final owner cannot be demoted; role changes revoke existing sessions", (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const id = randomUUID(),
    second = randomUUID();
  repo.db
    .prepare("INSERT INTO users VALUES(?,?,?,?,?,?)")
    .run(id, "first@example.test", "First", "OWNER", "not-a-real-hash", "2026-01-01");
  assert.throws(() => repo.changeRole(id, "VIEWER", id), /lastOwner/);
  repo.db
    .prepare("INSERT INTO users VALUES(?,?,?,?,?,?)")
    .run(
      second,
      "second@example.test",
      "Second",
      "OWNER",
      "not-a-real-hash",
      "2026-01-01",
    );
  repo.db.prepare("INSERT INTO sessions VALUES(?,?,?)").run("testhash", id, "2099-01-01");
  repo.changeRole(id, "EDITOR", second);
  assert.equal(Object.getPrototypeOf(repo.user(id)), Object.prototype);
  assert.ok(
    repo.users().every((user) => Object.getPrototypeOf(user) === Object.prototype),
  );
  assert.equal(repo.user(id)?.role, "EDITOR");
  assert.equal(repo.db.prepare("SELECT count(*) AS n FROM sessions").get()!.n, 0);
});
test("read-only roles cannot mutate, export, manage users or publish rule packs", () => {
  assert.equal(can("VIEWER", "read"), true);
  for (const permission of ["write", "export", "users", "rules"] as const)
    assert.equal(can("VIEWER", permission), false);
  assert.equal(can("EDITOR", "write"), true);
  assert.equal(can("EDITOR", "rules"), false);
  assert.equal(can("EDITOR", "users"), false);
});
test("all public form fields, core routes and statuses have three nonempty translations", () => {
  for (const key of [
    ...entities,
    ...stages,
    ...positions,
    ...Object.values(fields)
      .flat()
      .map((f) => f.key),
  ]) {
    assert.ok(messages[key], `Missing translation: ${key}`);
    assert.equal(messages[key].length, 3);
    assert.ok(messages[key].every(Boolean));
  }
  for (const locale of locales) assert.notEqual(translator(locale)("players"), "players");
});
test("metadata cannot leak into record edits", () => {
  assert.deepEqual(
    withoutMeta({
      id: "x",
      version: 3,
      createdAt: "x",
      updatedAt: "y",
      archivedAt: null,
      name: "Example",
    }),
    { name: "Example" },
  );
});
