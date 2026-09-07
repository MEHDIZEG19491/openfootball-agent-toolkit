export const positions = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "DM",
  "CM",
  "AM",
  "LW",
  "RW",
  "ST",
] as const;
export const stages = [
  "SCOUTED",
  "CONTACTED",
  "DOCUMENTS_RECEIVED",
  "MANDATE_RECEIVED",
  "PRESENTED",
  "CLUB_INTERESTED",
  "NEGOTIATION",
  "OFFER_RECEIVED",
  "CONTRACT_REVIEW",
  "SIGNED",
  "REJECTED",
  "CLOSED",
] as const;
export const availabilityStates = [
  "FREE_AGENT",
  "CONTRACTED",
  "LOAN_AVAILABLE",
  "UNKNOWN",
] as const;
export const roles = ["OWNER", "EDITOR", "VIEWER"] as const;
export type Role = (typeof roles)[number];
export type Entity =
  "players" | "coaches" | "clubs" | "opportunities" | "mandates" | "pipeline" | "rules";
export const entities: Entity[] = [
  "players",
  "coaches",
  "clubs",
  "opportunities",
  "mandates",
  "pipeline",
  "rules",
];
export type RecordMeta = {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
export type Cap = {
  date: string;
  count: number;
  level: "SENIOR" | "A_PRIME" | "OLYMPIC" | "U23" | "U20" | "U17";
  official: boolean;
  source: string;
};
export type Player = RecordMeta & {
  name: string;
  dateOfBirth: string | null;
  nationalities: string[];
  positions: string[];
  preferredFoot: "LEFT" | "RIGHT" | "BOTH" | "UNKNOWN";
  clubId: string | null;
  contractExpiresAt: string | null;
  availability: (typeof availabilityStates)[number];
  monthlySalary: number | null;
  expectedTransferFee: number | null;
  currency: string;
  caps: Cap[];
  capsComplete: boolean;
  videoUrl: string;
  documentUrl: string;
  notes: string;
};
export type Coach = RecordMeta & {
  name: string;
  nationalities: string[];
  licences: string[];
  systems: string[];
  languages: string[];
  experience: string;
  availability: (typeof availabilityStates)[number];
  monthlySalary: number | null;
  currency: string;
  regions: string[];
  videoUrl: string;
  documentUrl: string;
  notes: string;
};
export type Club = RecordMeta & {
  name: string;
  country: string;
  league: string;
  website: string;
  notes: string;
};
export type Opportunity = RecordMeta & {
  title: string;
  clubId: string | null;
  country: string;
  league: string;
  positions: string[];
  minimumAge: number | null;
  maximumAge: number | null;
  monthlySalaryMin: number | null;
  monthlySalaryMax: number | null;
  transferBudget: number | null;
  currency: string;
  nationalities: string[];
  requiredAvailability: string[];
  minimumCaps: number | null;
  capsFrom: string | null;
  capsTo: string | null;
  capsLevels: string[];
  deadline: string | null;
  status: "OPEN" | "CLOSED";
  ruleId: string | null;
  notes: string;
};
export type Mandate = RecordMeta & {
  playerId: string;
  startDate: string;
  endDate: string;
  exclusive: boolean;
  status: "DRAFT" | "ACTIVE" | "REVOKED";
  documentUrl: string;
  notes: string;
};
export type Pipeline = RecordMeta & {
  playerId: string;
  opportunityId: string;
  stage: (typeof stages)[number];
  notes: string;
};
export type RuleCheck =
  | { kind: "age"; minimum?: number; maximum?: number }
  | { kind: "positions"; allowed: string[] }
  | { kind: "nationalities"; allowed: string[] }
  | {
      kind: "caps";
      minimum: number;
      from: string;
      to: string;
      levels: string[];
    };
export type RulePack = RecordMeta & {
  name: string;
  schemaVersion: 1;
  jurisdiction: string;
  season: string;
  source: string;
  lastVerified: string | null;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "HISTORICAL";
  validFrom: string;
  validTo: string;
  checks: RuleCheck[];
  notes: string;
};
export type Records = {
  players: Player;
  coaches: Coach;
  clubs: Club;
  opportunities: Opportunity;
  mandates: Mandate;
  pipeline: Pipeline;
  rules: RulePack;
};
export type DataRecord = Records[Entity];
export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
};
export type Criterion = {
  code: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  expected: string;
  actual: string;
  source: "OPPORTUNITY" | "RULE_PACK";
  advisory: boolean;
};
export type MatchResult = {
  playerId: string;
  score: number;
  eligibility: "MATCH" | "NO_MATCH" | "INCOMPLETE";
  criteria: Criterion[];
  warnings: string[];
  evaluatedAt: string;
};
