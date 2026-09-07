import { randomUUID } from "node:crypto";
import { playerSchema, opportunitySchema, ruleSchema } from "../src/core/schemas";
import type { Player, Opportunity, RulePack } from "../src/core/types";
export const meta = () => ({
  id: randomUUID(),
  version: 1,
  createdAt: "2026-09-07T00:00:00Z",
  updatedAt: "2026-09-07T00:00:00Z",
  archivedAt: null,
});
export const player = (overrides: Partial<Player> = {}): Player => ({
  ...playerSchema.parse({
    name: "Fictional test player",
    dateOfBirth: "2002-04-12",
    positions: ["LW"],
    nationalities: ["XX"],
    monthlySalary: 4000,
    expectedTransferFee: 0,
    availability: "FREE_AGENT",
  }),
  ...meta(),
  ...overrides,
});
export const opportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  ...opportunitySchema.parse({
    title: "Fictional test requirement",
    country: "XX",
    positions: ["LW"],
    maximumAge: 27,
    monthlySalaryMax: 5000,
    currency: "EUR",
  }),
  ...meta(),
  ...overrides,
});
export const rule = (overrides: Partial<RulePack> = {}): RulePack => ({
  ...ruleSchema.parse({
    name: "Fictional test rules",
    jurisdiction: "XX — Test league",
    season: "2026-27",
    source: "https://example.com/fictional-rules",
    lastVerified: "2026-09-01",
    verificationStatus: "VERIFIED",
    validFrom: "2026-07-01",
    validTo: "2027-06-30",
    checks: [{ kind: "age", maximum: 27 }],
  }),
  ...meta(),
  ...overrides,
});
