import { availabilityStates, positions, stages, type Entity } from "../core/types";
export type Field = {
  key: string;
  kind?:
    | "text"
    | "number"
    | "date"
    | "url"
    | "textarea"
    | "tags"
    | "select"
    | "multi"
    | "checkbox"
    | "reference"
    | "caps"
    | "json";
  required?: boolean;
  options?: readonly string[];
  target?: Entity;
  initial?: unknown;
};
const f = (
  key: string,
  kind: Field["kind"] = "text",
  extra: Partial<Field> = {},
): Field => ({ key, kind, ...extra });
const availability = f("availability", "select", {
  options: availabilityStates,
  initial: "UNKNOWN",
});
const currency = f("currency", "text", { initial: "EUR", required: true });
const notes = f("notes", "textarea");
const nationalities = f("nationalities", "tags");
const links = [f("videoUrl", "url"), f("documentUrl", "url")];
const levels = ["SENIOR", "A_PRIME", "OLYMPIC", "U23", "U20", "U17"];
export const fields: Record<Entity, Field[]> = {
  players: [
    f("name", "text", { required: true }),
    f("dateOfBirth", "date"),
    nationalities,
    f("positions", "multi", { options: positions }),
    f("preferredFoot", "select", {
      options: ["LEFT", "RIGHT", "BOTH", "UNKNOWN"],
      initial: "UNKNOWN",
    }),
    f("clubId", "reference", { target: "clubs" }),
    f("contractExpiresAt", "date"),
    availability,
    f("monthlySalary", "number"),
    f("expectedTransferFee", "number"),
    currency,
    ...links,
    f("caps", "caps"),
    f("capsComplete", "checkbox"),
    notes,
  ],
  coaches: [
    f("name", "text", { required: true }),
    nationalities,
    f("licences", "tags"),
    f("systems", "tags"),
    f("languages", "tags"),
    availability,
    f("monthlySalary", "number"),
    currency,
    f("regions", "tags"),
    f("experience", "textarea"),
    ...links,
    notes,
  ],
  clubs: [
    f("name", "text", { required: true }),
    f("country", "text", { required: true }),
    f("league"),
    f("website", "url"),
    notes,
  ],
  opportunities: [
    f("title", "text", { required: true }),
    f("clubId", "reference", { target: "clubs" }),
    f("country", "text", { required: true }),
    f("league"),
    f("positions", "multi", { options: positions }),
    f("minimumAge", "number"),
    f("maximumAge", "number"),
    f("monthlySalaryMin", "number"),
    f("monthlySalaryMax", "number"),
    f("transferBudget", "number"),
    currency,
    nationalities,
    f("requiredAvailability", "multi", { options: availabilityStates }),
    f("minimumCaps", "number"),
    f("capsFrom", "date"),
    f("capsTo", "date"),
    f("capsLevels", "multi", { options: levels }),
    f("deadline", "date"),
    f("status", "select", { options: ["OPEN", "CLOSED"], initial: "OPEN" }),
    f("ruleId", "reference", { target: "rules" }),
    notes,
  ],
  mandates: [
    f("playerId", "reference", { target: "players", required: true }),
    f("startDate", "date", { required: true }),
    f("endDate", "date", { required: true }),
    f("exclusive", "checkbox"),
    f("status", "select", {
      options: ["DRAFT", "ACTIVE", "REVOKED"],
      initial: "DRAFT",
    }),
    f("documentUrl", "url"),
    notes,
  ],
  pipeline: [
    f("playerId", "reference", { target: "players", required: true }),
    f("opportunityId", "reference", {
      target: "opportunities",
      required: true,
    }),
    f("stage", "select", { options: stages, initial: "SCOUTED" }),
    notes,
  ],
  rules: [
    f("name", "text", { required: true }),
    f("schemaVersion", "number", { initial: 1, required: true }),
    f("jurisdiction", "text", { required: true }),
    f("season", "text", { required: true }),
    f("source", "url"),
    f("lastVerified", "date"),
    f("verificationStatus", "select", {
      options: ["UNVERIFIED", "VERIFIED", "HISTORICAL"],
      initial: "UNVERIFIED",
    }),
    f("validFrom", "date", { required: true }),
    f("validTo", "date", { required: true }),
    f("checks", "json", {
      initial: [{ kind: "age", minimum: 18, maximum: 30 }],
      required: true,
    }),
    notes,
  ],
};

export function formRecord(entity: Entity, form: FormData): Record<string, unknown> {
  return Object.fromEntries(
    fields[entity].map((field) => {
      const value = String(form.get(field.key) ?? "");
      if (field.kind === "checkbox") return [field.key, form.has(field.key)];
      if (field.kind === "multi") return [field.key, form.getAll(field.key).map(String)];
      if (field.kind === "tags")
        return [
          field.key,
          value
            .split(";")
            .map((v) => v.trim())
            .filter(Boolean),
        ];
      if (field.kind === "caps" || field.kind === "json")
        return [field.key, JSON.parse(value || "[]")];
      if (field.kind === "number")
        return [field.key, value === "" ? null : Number(value)];
      if (field.kind === "date" || field.kind === "reference")
        return [field.key, value || null];
      return [field.key, value.trim()];
    }),
  );
}
export function withoutMeta(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => !["id", "version", "createdAt", "updatedAt", "archivedAt"].includes(key),
    ),
  );
}
