import { z } from "zod";
import type { DataRecord, Entity } from "../core/types";
import { schemas } from "../core/schemas";
import { parseCsv, encodeCsv } from "../core/csv";
import { DomainError, type Repository } from "./database";

export const columns: Record<Entity, string[]> = {
  players: [
    "name",
    "dateOfBirth",
    "nationalities",
    "positions",
    "preferredFoot",
    "clubId",
    "contractExpiresAt",
    "availability",
    "monthlySalary",
    "expectedTransferFee",
    "currency",
    "caps",
    "capsComplete",
    "videoUrl",
    "documentUrl",
    "notes",
  ],
  coaches: [
    "name",
    "nationalities",
    "licences",
    "systems",
    "languages",
    "experience",
    "availability",
    "monthlySalary",
    "currency",
    "regions",
    "videoUrl",
    "documentUrl",
    "notes",
  ],
  clubs: ["name", "country", "league", "website", "notes"],
  opportunities: [
    "title",
    "clubId",
    "country",
    "league",
    "positions",
    "minimumAge",
    "maximumAge",
    "monthlySalaryMin",
    "monthlySalaryMax",
    "transferBudget",
    "currency",
    "nationalities",
    "requiredAvailability",
    "minimumCaps",
    "capsFrom",
    "capsTo",
    "capsLevels",
    "deadline",
    "status",
    "ruleId",
    "notes",
  ],
  mandates: [
    "playerId",
    "startDate",
    "endDate",
    "exclusive",
    "status",
    "documentUrl",
    "notes",
  ],
  pipeline: ["playerId", "opportunityId", "stage", "notes"],
  rules: [
    "name",
    "schemaVersion",
    "jurisdiction",
    "season",
    "source",
    "lastVerified",
    "verificationStatus",
    "validFrom",
    "validTo",
    "checks",
    "notes",
  ],
};
const arrays = new Set([
  "nationalities",
  "positions",
  "licences",
  "systems",
  "languages",
  "regions",
  "requiredAvailability",
  "capsLevels",
]);
const numbers = new Set([
  "minimumAge",
  "maximumAge",
  "monthlySalary",
  "monthlySalaryMin",
  "monthlySalaryMax",
  "transferBudget",
  "minimumCaps",
  "schemaVersion",
  "expectedTransferFee",
]);
const booleans = new Set(["exclusive", "capsComplete"]);
const nullables = new Set([
  "dateOfBirth",
  "clubId",
  "contractExpiresAt",
  "capsFrom",
  "capsTo",
  "deadline",
  "lastVerified",
  "ruleId",
]);

function fromCsv(row: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (arrays.has(key))
        return [
          key,
          value.trim()
            ? value
                .split(";")
                .map((v) => v.trim())
                .filter(Boolean)
            : [],
        ];
      if (key === "caps" || key === "checks")
        return [key, value ? JSON.parse(value) : []];
      if (booleans.has(key)) {
        if (!["true", "false", ""].includes(value.toLowerCase()))
          throw new Error(`${key} must be true or false`);
        return [key, value.toLowerCase() === "true"];
      }
      if (numbers.has(key)) {
        if (value !== "" && !/^\d+$/.test(value))
          throw new Error(`${key} must be a non-negative integer`);
        return [key, value === "" ? null : Number(value)];
      }
      if (nullables.has(key)) return [key, value || null];
      // Undo only the neutralization prefix our exporter may add to formula-like text.
      return [
        key,
        /^'[\s\uFEFF]*[=+\-@]/.test(value) || /^'[\t\r\n]/.test(value)
          ? value.slice(1)
          : value,
      ];
    }),
  );
}

export type ImportRow = { id?: string; data: Record<string, unknown> };
export function prepareImport(
  entity: Entity,
  content: string,
  format: "csv" | "json",
): ImportRow[] {
  if (Buffer.byteLength(content) > 1_048_576) throw new DomainError("tooLarge", 413);
  const rows: unknown =
    format === "csv" ? parseCsv(content).map(fromCsv) : JSON.parse(content);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500)
    throw new DomainError("importRowLimit");
  const seen = new Set<string>();
  return rows.map((row, i) => {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw new DomainError(`Row ${i + 1}: invalid record`);
    const { id, ...data } = row as Record<string, unknown>;
    const parsedId = id ? z.uuid().parse(id) : undefined;
    if (parsedId && seen.has(parsedId)) throw new DomainError("duplicateRecord", 409);
    if (parsedId) seen.add(parsedId);
    const result = schemas[entity].safeParse(data);
    if (!result.success)
      throw new DomainError(
        `Row ${i + 1}: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      );
    return { id: parsedId, data: result.data };
  });
}
export function commitImport(
  repo: Repository,
  entity: Entity,
  rows: ImportRow[],
  actor: string,
) {
  return repo.transaction(() =>
    rows.map((row) => repo.create(entity, row.data, actor, row.id)),
  );
}
export function exportRecords(
  entity: Entity,
  records: DataRecord[],
  format: "csv" | "json",
) {
  const headers = ["id", ...columns[entity]];
  const rows = records.map((record) =>
    Object.fromEntries(
      headers.map((key) => [key, (record as unknown as Record<string, unknown>)[key]]),
    ),
  );
  if (format === "json") return JSON.stringify(rows, null, 2) + "\n";
  return encodeCsv(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          arrays.has(key) && Array.isArray(value) ? value.join(";") : value,
        ]),
      ),
    ),
    headers,
  );
}
