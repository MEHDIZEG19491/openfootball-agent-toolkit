import { ageOn, isDate } from "./dates";
import type {
  Criterion,
  MatchResult,
  Opportunity,
  Player,
  RuleCheck,
  RulePack,
} from "./types";

/** Only dated, official, sourced entries in the requested window count. */
export function eligibleCaps(
  player: Player,
  from: string,
  to: string,
  levels: string[],
  asOf: string,
): number {
  return player.caps
    .filter(
      (cap) =>
        cap.official &&
        cap.source &&
        cap.date >= from &&
        cap.date <= to &&
        cap.date <= asOf &&
        levels.includes(cap.level),
    )
    .reduce((sum, cap) => sum + cap.count, 0);
}

function range(
  actual: number | null,
  minimum?: number | null,
  maximum?: number | null,
): Criterion["status"] {
  if (actual === null) return "UNKNOWN";
  return (minimum == null || actual >= minimum) && (maximum == null || actual <= maximum)
    ? "PASS"
    : "FAIL";
}
function intersection(actual: string[], allowed: string[]): Criterion["status"] {
  if (!actual.length) return "UNKNOWN";
  return actual.some((value) => allowed.includes(value)) ? "PASS" : "FAIL";
}
const interval = (min?: number | null, max?: number | null) =>
  `${min ?? "—"} … ${max ?? "—"}`;

export function matchPlayer(
  player: Player,
  opportunity: Opportunity,
  asOf: string,
  rule?: RulePack | null,
): MatchResult {
  if (!isDate(asOf)) throw new Error("Matching requires a valid evaluation date");
  const criteria: Criterion[] = [];
  const warnings: string[] = [];
  const push = (
    code: string,
    status: Criterion["status"],
    expected: string,
    actual: string,
    source: Criterion["source"] = "OPPORTUNITY",
    advisory = false,
  ) => criteria.push({ code, status, expected, actual, source, advisory });

  if (opportunity.status !== "OPEN")
    push("opportunityStatus", "FAIL", "OPEN", opportunity.status);
  if (opportunity.deadline && opportunity.deadline < asOf)
    push("deadline", "FAIL", opportunity.deadline, asOf);
  if (opportunity.positions.length)
    push(
      "positions",
      intersection(player.positions, opportunity.positions),
      opportunity.positions.join(", "),
      player.positions.join(", ") || "—",
    );
  const age = ageOn(player.dateOfBirth, asOf);
  if (opportunity.minimumAge !== null || opportunity.maximumAge !== null)
    push(
      "age",
      range(age, opportunity.minimumAge, opportunity.maximumAge),
      interval(opportunity.minimumAge, opportunity.maximumAge),
      age?.toString() ?? "—",
    );
  if (opportunity.nationalities.length)
    push(
      "nationalities",
      intersection(player.nationalities, opportunity.nationalities),
      opportunity.nationalities.join(", "),
      player.nationalities.join(", ") || "—",
    );
  if (opportunity.requiredAvailability.length)
    push(
      "availability",
      player.availability === "UNKNOWN"
        ? "UNKNOWN"
        : intersection([player.availability], opportunity.requiredAvailability),
      opportunity.requiredAvailability.join(", "),
      player.availability,
    );
  if (opportunity.monthlySalaryMin !== null || opportunity.monthlySalaryMax !== null)
    push(
      "salary",
      player.currency !== opportunity.currency
        ? "UNKNOWN"
        : range(
            player.monthlySalary,
            opportunity.monthlySalaryMin,
            opportunity.monthlySalaryMax,
          ),
      `${interval(opportunity.monthlySalaryMin, opportunity.monthlySalaryMax)} ${opportunity.currency}`,
      player.monthlySalary === null ? "—" : `${player.monthlySalary} ${player.currency}`,
    );
  if (opportunity.transferBudget !== null)
    push(
      "transferFee",
      player.currency !== opportunity.currency
        ? "UNKNOWN"
        : range(player.expectedTransferFee, null, opportunity.transferBudget),
      `≤ ${opportunity.transferBudget} ${opportunity.currency}`,
      player.expectedTransferFee === null
        ? "—"
        : `${player.expectedTransferFee} ${player.currency}`,
    );
  if (opportunity.minimumCaps !== null && opportunity.minimumCaps > 0) {
    const count = eligibleCaps(
      player,
      opportunity.capsFrom ?? "0000-01-01",
      opportunity.capsTo ?? asOf,
      opportunity.capsLevels,
      asOf,
    );
    const completeRequirement =
      !!opportunity.capsFrom && !!opportunity.capsTo && opportunity.capsLevels.length > 0;
    push(
      "caps",
      !completeRequirement
        ? "UNKNOWN"
        : count >= opportunity.minimumCaps
          ? "PASS"
          : player.capsComplete
            ? "FAIL"
            : "UNKNOWN",
      `≥ ${opportunity.minimumCaps}; ${opportunity.capsFrom} … ${opportunity.capsTo}; ${opportunity.capsLevels.join(", ")}`,
      String(count),
    );
  }

  if (opportunity.ruleId && !rule) {
    warnings.push("ruleMissing");
    push("rulePack", "UNKNOWN", opportunity.ruleId, "—", "RULE_PACK");
  }
  if (rule) {
    const advisory =
      rule.verificationStatus !== "VERIFIED" ||
      !rule.source ||
      !rule.lastVerified ||
      rule.lastVerified > asOf ||
      asOf < rule.validFrom ||
      asOf > rule.validTo;
    if (advisory) {
      warnings.push("ruleAdvisory");
      // An unverified/expired pack can inform discussion but cannot certify eligibility.
      push(
        "ruleVerification",
        "UNKNOWN",
        "VERIFIED",
        rule.verificationStatus,
        "RULE_PACK",
      );
    }
    for (const check of rule.checks) {
      const result = evaluateRule(check, player, asOf);
      push(
        `rule.${check.kind}`,
        result.status,
        result.expected,
        result.actual,
        "RULE_PACK",
        advisory,
      );
    }
  }
  const binding = criteria.filter((c) => !c.advisory);
  const passed = binding.filter((c) => c.status === "PASS").length;
  const eligibility = binding.some((c) => c.status === "FAIL")
    ? "NO_MATCH"
    : !binding.length || binding.some((c) => c.status === "UNKNOWN")
      ? "INCOMPLETE"
      : "MATCH";
  return {
    playerId: player.id,
    score: binding.length ? Math.round((passed / binding.length) * 100) : 0,
    eligibility,
    criteria,
    warnings,
    evaluatedAt: asOf,
  };
}

function evaluateRule(
  check: RuleCheck,
  player: Player,
  asOf: string,
): Pick<Criterion, "status" | "actual" | "expected"> {
  if (check.kind === "age") {
    const value = ageOn(player.dateOfBirth, asOf);
    return {
      status: range(value, check.minimum, check.maximum),
      expected: interval(check.minimum, check.maximum),
      actual: value?.toString() ?? "—",
    };
  }
  if (check.kind === "positions" || check.kind === "nationalities") {
    const values = player[check.kind];
    return {
      status: intersection(values, check.allowed),
      expected: check.allowed.join(", "),
      actual: values.join(", ") || "—",
    };
  }
  const count = eligibleCaps(player, check.from, check.to, check.levels, asOf);
  return {
    status: count >= check.minimum ? "PASS" : player.capsComplete ? "FAIL" : "UNKNOWN",
    expected: `≥ ${check.minimum}; ${check.from} … ${check.to}; ${check.levels.join(", ")}`,
    actual: String(count),
  };
}
