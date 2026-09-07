import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, csvCell } from "../src/core/csv";
import {
  playerSchema,
  opportunitySchema,
  ruleSchema,
  safeUrl,
} from "../src/core/schemas";
import { prepareImport, exportRecords } from "../src/server/imports";
import { player } from "./fixtures";
test("CSV supports BOM, CRLF, commas, quotes and multiline notes", () => {
  const rows = parseCsv('\uFEFFname,notes\r\n"Example, A","Line 1\nHe said ""yes"""\r\n');
  assert.deepEqual(rows, [{ name: "Example, A", notes: 'Line 1\nHe said "yes"' }]);
});
test("malformed CSV is rejected before mutation", () => {
  for (const value of [
    "name,name\na,b",
    "name,notes\na",
    'name\n"unclosed',
    'name\n"a"x',
    "__proto__,name\na,b",
    "",
  ])
    assert.throws(() => parseCsv(value));
});
test("CSV enforces row and byte limits", () => {
  assert.throws(() => parseCsv("name\na\nb\n", 1));
  assert.throws(() => parseCsv("a".repeat(1_048_577)));
});
test("spreadsheet formula prefixes and leading control characters are neutralized", () => {
  for (const cell of [
    "=1+1",
    "+SUM(A1)",
    "-2+3",
    "@SUM(A1)",
    '  =IMPORTXML("x")',
    "\tcmd",
  ])
    assert.ok(csvCell(cell).startsWith("\"'"));
  assert.equal(csvCell("ordinary text"), '"ordinary text"');
});
test("JSON and CSV export/import round trips preserve IDs, unicode and structured caps", () => {
  const record = player({
    name: "DEMO — مثال é",
    notes: 'line 1\n"quoted", text',
    caps: [
      {
        date: "2026-01-01",
        count: 2,
        level: "U20",
        official: true,
        source: "https://example.com/fixture",
      },
    ],
  });
  for (const format of ["csv", "json"] as const) {
    const rows = prepareImport(
      "players",
      exportRecords("players", [record], format),
      format,
    );
    assert.equal(rows[0].id, record.id);
    assert.equal(rows[0].data.name, record.name);
    assert.deepEqual(rows[0].data.caps, record.caps);
    assert.equal(rows[0].data.notes, record.notes);
  }
});
test("unknown or privilege-like fields cannot be imported", () => {
  assert.throws(() =>
    prepareImport("players", '[{"name":"Example Player","role":"OWNER"}]', "json"),
  );
  assert.throws(() => prepareImport("players", "name,role\nExample Player,OWNER", "csv"));
});
test("duplicate import IDs are rejected and empty arrays are not an import", () => {
  const p = player();
  const exported = exportRecords("players", [p, p], "json");
  assert.throws(() => prepareImport("players", exported, "json"));
  assert.throws(() => prepareImport("players", "[]", "json"));
});
test("unsafe URLs, credentials in URLs and protocol tricks are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "https://name:secret@example.com",
  ])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(safeUrl.safeParse("https://example.com/clip").success, true);
});
test("birth dates, caps windows and numeric values are validated", () => {
  assert.equal(
    playerSchema.safeParse({ name: "Test Player", dateOfBirth: "2025-02-29" }).success,
    false,
  );
  assert.equal(
    playerSchema.safeParse({ name: "Test Player", monthlySalary: -1 }).success,
    false,
  );
  assert.equal(
    opportunitySchema.safeParse({
      title: "Test Opportunity",
      country: "XX",
      minimumAge: 30,
      maximumAge: 20,
    }).success,
    false,
  );
  assert.equal(
    opportunitySchema.safeParse({
      title: "Test Opportunity",
      country: "XX",
      minimumCaps: 5,
    }).success,
    false,
  );
});
test("verified rule packs require evidence and valid dates", () => {
  const base = {
    name: "Test Rules",
    jurisdiction: "XX",
    season: "2026-27",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    checks: [{ kind: "age", maximum: 27 }],
  };
  assert.equal(
    ruleSchema.safeParse({ ...base, verificationStatus: "VERIFIED" }).success,
    false,
  );
  assert.equal(
    ruleSchema.safeParse({ ...base, verificationStatus: "UNVERIFIED" }).success,
    true,
  );
  assert.equal(
    ruleSchema.safeParse({
      ...base,
      checks: [{ kind: "age", minimum: 40, maximum: 20 }],
    }).success,
    false,
  );
});
