import test from "node:test";
import assert from "node:assert/strict";
import { ageOn, isDate, daysUntil } from "../src/core/dates";
import { matchPlayer, eligibleCaps } from "../src/core/matching";
import { player, opportunity, rule } from "./fixtures";
const asOf = "2026-09-07";
test("calendar age respects birthdays, UTC and leap days", () => {
  assert.equal(ageOn("2000-09-08", asOf), 25);
  assert.equal(ageOn("2000-09-07", asOf), 26);
  assert.equal(ageOn("2004-02-29", "2025-02-28"), 20);
  assert.equal(ageOn("2004-02-29", "2025-03-01"), 21);
  assert.equal(ageOn("2027-01-01", asOf), null);
  assert.equal(ageOn(null, asOf), null);
  assert.equal(isDate("2025-02-29"), false);
  assert.equal(isDate("2026-13-01"), false);
  assert.equal(daysUntil("2026-09-08", asOf), 1);
});
test("a fully specified matching profile passes every stated criterion", () => {
  const result = matchPlayer(player(), opportunity(), asOf);
  assert.equal(result.eligibility, "MATCH");
  assert.equal(result.score, 100);
  assert.equal(result.criteria.length, 3);
});
test("a failed condition cannot be concealed by a high score", () => {
  const result = matchPlayer(player({ dateOfBirth: "1990-01-01" }), opportunity(), asOf);
  assert.equal(result.eligibility, "NO_MATCH");
  assert.equal(result.score, 67);
  assert.equal(result.criteria.find((c) => c.code === "age")?.status, "FAIL");
});
test("unknown dates and salaries stay unknown, not zero", () => {
  const result = matchPlayer(
    player({ dateOfBirth: null, monthlySalary: null }),
    opportunity(),
    asOf,
  );
  assert.equal(result.eligibility, "INCOMPLETE");
  assert.equal(result.score, 33);
});
test("age boundaries are inclusive and minimum ages are enforced", () => {
  assert.equal(
    matchPlayer(player({ dateOfBirth: "1999-09-07" }), opportunity(), asOf).eligibility,
    "MATCH",
  );
  assert.equal(
    matchPlayer(
      player({ dateOfBirth: "2008-09-08" }),
      opportunity({ minimumAge: 18 }),
      asOf,
    ).eligibility,
    "NO_MATCH",
  );
});
test("mixed currencies are not silently compared", () => {
  const result = matchPlayer(
    player({ currency: "USD" }),
    opportunity({ transferBudget: 100 }),
    asOf,
  );
  assert.equal(result.criteria.find((c) => c.code === "salary")?.status, "UNKNOWN");
  assert.equal(result.criteria.find((c) => c.code === "transferFee")?.status, "UNKNOWN");
});
test("zero fees are known values and missing fees are unknown", () => {
  assert.equal(
    matchPlayer(player(), opportunity({ transferBudget: 0 }), asOf).eligibility,
    "MATCH",
  );
  assert.equal(
    matchPlayer(
      player({ expectedTransferFee: null }),
      opportunity({ transferBudget: 0 }),
      asOf,
    ).eligibility,
    "INCOMPLETE",
  );
});
test("dual nationality uses any eligible nationality; missing nationality is unknown", () => {
  const opp = opportunity({ nationalities: ["YY"] });
  assert.equal(
    matchPlayer(player({ nationalities: ["XX", "YY"] }), opp, asOf).eligibility,
    "MATCH",
  );
  assert.equal(
    matchPlayer(player({ nationalities: [] }), opp, asOf).eligibility,
    "INCOMPLETE",
  );
});
test("caps exclude friendlies, unsourced claims, future dates, other levels and out-of-window dates", () => {
  const base = {
    date: "2026-08-01",
    count: 2,
    level: "SENIOR" as const,
    official: true,
    source: "https://example.com/fixture",
  };
  const p = player({
    caps: [
      base,
      { ...base, official: false },
      { ...base, source: "" },
      { ...base, date: "2027-01-01" },
      { ...base, date: "2023-01-01" },
      { ...base, level: "U17" },
    ],
  });
  assert.equal(eligibleCaps(p, "2024-01-01", "2027-12-31", ["SENIOR"], asOf), 2);
});
test("an incomplete caps history is unknown below the threshold; complete history can fail", () => {
  const opp = opportunity({
    minimumCaps: 5,
    capsFrom: "2024-01-01",
    capsTo: asOf,
    capsLevels: ["SENIOR"],
  });
  assert.equal(matchPlayer(player(), opp, asOf).eligibility, "INCOMPLETE");
  assert.equal(
    matchPlayer(player({ capsComplete: true }), opp, asOf).eligibility,
    "NO_MATCH",
  );
});
test("documented caps meeting the threshold suffice even if history is incomplete", () => {
  const p = player({
    caps: [
      {
        date: "2026-03-01",
        count: 5,
        level: "U20",
        official: true,
        source: "https://example.com/report",
      },
    ],
  });
  assert.equal(
    matchPlayer(
      p,
      opportunity({
        minimumCaps: 5,
        capsFrom: "2024-01-01",
        capsTo: asOf,
        capsLevels: ["U20"],
      }),
      asOf,
    ).eligibility,
    "MATCH",
  );
});
test("closed and expired opportunities fail but the deadline day is inclusive", () => {
  assert.equal(
    matchPlayer(player(), opportunity({ status: "CLOSED" }), asOf).eligibility,
    "NO_MATCH",
  );
  assert.equal(
    matchPlayer(player(), opportunity({ deadline: "2026-09-06" }), asOf).eligibility,
    "NO_MATCH",
  );
  assert.equal(
    matchPlayer(player(), opportunity({ deadline: asOf }), asOf).eligibility,
    "MATCH",
  );
});
test("unknown availability is never accepted as an affirmative match", () => {
  assert.equal(
    matchPlayer(
      player({ availability: "UNKNOWN" }),
      opportunity({ requiredAvailability: ["FREE_AGENT"] }),
      asOf,
    ).eligibility,
    "INCOMPLETE",
  );
});
test("no recorded conditions cannot certify a match", () => {
  const result = matchPlayer(
    player(),
    opportunity({ positions: [], maximumAge: null, monthlySalaryMax: null }),
    asOf,
  );
  assert.equal(result.score, 0);
  assert.equal(result.eligibility, "INCOMPLETE");
});
test("verified current rules are enforced with explanations", () => {
  const r = rule({ checks: [{ kind: "age", maximum: 23 }] });
  const result = matchPlayer(player(), opportunity({ ruleId: r.id }), asOf, r);
  assert.equal(result.eligibility, "NO_MATCH");
  assert.equal(result.criteria.at(-1)?.source, "RULE_PACK");
});
test("unverified or expired rule packs cannot certify eligibility", () => {
  for (const patch of [
    { verificationStatus: "UNVERIFIED" as const },
    { validTo: "2026-09-01" },
    { verificationStatus: "HISTORICAL" as const },
  ]) {
    const r = rule(patch),
      result = matchPlayer(player(), opportunity({ ruleId: r.id }), asOf, r);
    assert.equal(result.eligibility, "INCOMPLETE");
    assert.ok(result.warnings.includes("ruleAdvisory"));
    assert.ok(
      result.criteria.filter((c) => c.code.startsWith("rule.")).every((c) => c.advisory),
    );
  }
});
test("a missing selected rule pack is reported, not ignored", () => {
  assert.equal(
    matchPlayer(player(), opportunity({ ruleId: rule().id }), asOf, null).eligibility,
    "INCOMPLETE",
  );
});
test("matching rejects an invalid evaluation date", () =>
  assert.throws(() => matchPlayer(player(), opportunity(), "not-a-date")));
