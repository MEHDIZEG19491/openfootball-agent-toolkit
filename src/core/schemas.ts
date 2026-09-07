import { z } from "zod";
import { isDate, todayUTC } from "./dates";
import { availabilityStates, positions, stages, type Entity } from "./types";

const short = z
  .string()
  .trim()
  .max(160)
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Control characters are not allowed");
const name = short.min(2);
const notes = z.string().trim().max(6000).default("");
const date = z.string().refine(isDate, "Use a valid YYYY-MM-DD date");
const nullableDate = date.nullable().default(null);
const id = z.uuid();
const optionalId = id.nullable().default(null);
const amount = z.number().int().min(0).max(1_000_000_000).nullable().default(null);
const country = z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code");
const countries = z
  .array(country)
  .max(8)
  .refine((v) => new Set(v).size === v.length, "Duplicate country codes")
  .default([]);
const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use a three-letter currency code")
  .default("EUR");
const tags = z.array(short.min(1)).max(30).default([]);
export const safeUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTP(S) URL without credentials")
  .default("");
const positionList = z
  .array(z.enum(positions))
  .max(positions.length)
  .refine((v) => new Set(v).size === v.length, "Duplicate positions")
  .default([]);
const levels = z
  .array(z.enum(["SENIOR", "A_PRIME", "OLYMPIC", "U23", "U20", "U17"]))
  .max(6)
  .default([]);

export const playerSchema = z
  .object({
    name,
    dateOfBirth: nullableDate.refine(
      (v) => !v || v <= todayUTC(),
      "Birth date cannot be in the future",
    ),
    nationalities: countries,
    positions: positionList,
    preferredFoot: z.enum(["LEFT", "RIGHT", "BOTH", "UNKNOWN"]).default("UNKNOWN"),
    clubId: optionalId,
    contractExpiresAt: nullableDate,
    availability: z.enum(availabilityStates).default("UNKNOWN"),
    monthlySalary: amount,
    expectedTransferFee: amount,
    currency,
    caps: z
      .array(
        z
          .object({
            date,
            count: z.number().int().min(1).max(100),
            level: z.enum(["SENIOR", "A_PRIME", "OLYMPIC", "U23", "U20", "U17"]),
            official: z.boolean(),
            source: safeUrl,
          })
          .strict(),
      )
      .max(500)
      .default([]),
    capsComplete: z.boolean().default(false),
    videoUrl: safeUrl,
    documentUrl: safeUrl,
    notes,
  })
  .strict();

export const coachSchema = z
  .object({
    name,
    nationalities: countries,
    licences: tags,
    systems: tags,
    languages: tags,
    experience: z.string().max(4000).default(""),
    availability: z.enum(availabilityStates).default("UNKNOWN"),
    monthlySalary: amount,
    currency,
    regions: tags,
    videoUrl: safeUrl,
    documentUrl: safeUrl,
    notes,
  })
  .strict();

export const clubSchema = z
  .object({ name, country, league: short.default(""), website: safeUrl, notes })
  .strict();

export const opportunitySchema = z
  .object({
    title: name,
    clubId: optionalId,
    country,
    league: short.default(""),
    positions: positionList,
    minimumAge: z.number().int().min(0).max(100).nullable().default(null),
    maximumAge: z.number().int().min(0).max(100).nullable().default(null),
    monthlySalaryMin: amount,
    monthlySalaryMax: amount,
    transferBudget: amount,
    currency,
    nationalities: countries,
    requiredAvailability: z.array(z.enum(availabilityStates)).max(4).default([]),
    minimumCaps: z.number().int().min(0).max(1000).nullable().default(null),
    capsFrom: nullableDate,
    capsTo: nullableDate,
    capsLevels: levels,
    deadline: nullableDate,
    status: z.enum(["OPEN", "CLOSED"]).default("OPEN"),
    ruleId: optionalId,
    notes,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.minimumAge !== null && v.maximumAge !== null && v.minimumAge > v.maximumAge)
      ctx.addIssue({
        code: "custom",
        path: ["maximumAge"],
        message: "Maximum age must not be below minimum age",
      });
    if (
      v.monthlySalaryMin !== null &&
      v.monthlySalaryMax !== null &&
      v.monthlySalaryMin > v.monthlySalaryMax
    )
      ctx.addIssue({
        code: "custom",
        path: ["monthlySalaryMax"],
        message: "Maximum salary must not be below minimum salary",
      });
    if (v.capsFrom && v.capsTo && v.capsFrom > v.capsTo)
      ctx.addIssue({
        code: "custom",
        path: ["capsTo"],
        message: "End date must follow start date",
      });
    if (
      v.minimumCaps !== null &&
      v.minimumCaps > 0 &&
      (!v.capsFrom || !v.capsTo || !v.capsLevels.length)
    )
      ctx.addIssue({
        code: "custom",
        path: ["minimumCaps"],
        message: "Caps requirements need a date window and eligible team levels",
      });
  });

export const mandateSchema = z
  .object({
    playerId: id,
    startDate: date,
    endDate: date,
    exclusive: z.boolean().default(false),
    status: z.enum(["DRAFT", "ACTIVE", "REVOKED"]).default("DRAFT"),
    documentUrl: safeUrl,
    notes,
  })
  .strict()
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "End date must follow start date",
  });

export const pipelineSchema = z
  .object({
    playerId: id,
    opportunityId: id,
    stage: z.enum(stages).default("SCOUTED"),
    notes,
  })
  .strict();

const ruleCheck = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("age"),
      minimum: z.number().int().min(0).max(100).optional(),
      maximum: z.number().int().min(0).max(100).optional(),
    })
    .strict()
    .refine((v) => v.minimum !== undefined || v.maximum !== undefined, "Set an age bound")
    .refine(
      (v) => v.minimum === undefined || v.maximum === undefined || v.minimum <= v.maximum,
      "Invalid age interval",
    ),
  z
    .object({
      kind: z.literal("positions"),
      allowed: z.array(z.enum(positions)).min(1).max(12),
    })
    .strict(),
  z
    .object({
      kind: z.literal("nationalities"),
      allowed: z.array(country).min(1).max(100),
    })
    .strict(),
  z
    .object({
      kind: z.literal("caps"),
      minimum: z.number().int().min(1).max(1000),
      from: date,
      to: date,
      levels: levels.refine((v) => v.length > 0, "Select eligible team levels"),
    })
    .strict()
    .refine((v) => v.from <= v.to, "Invalid caps date interval"),
]);

export const ruleSchema = z
  .object({
    name,
    schemaVersion: z.literal(1).default(1),
    jurisdiction: short.min(2),
    season: short.min(2),
    source: safeUrl,
    lastVerified: nullableDate,
    verificationStatus: z
      .enum(["UNVERIFIED", "VERIFIED", "HISTORICAL"])
      .default("UNVERIFIED"),
    validFrom: date,
    validTo: date,
    checks: z.array(ruleCheck).min(1).max(32),
    notes,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.validFrom > v.validTo)
      ctx.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "Invalid validity interval",
      });
    if (
      v.verificationStatus === "VERIFIED" &&
      (!v.source || !v.lastVerified || v.lastVerified > todayUTC())
    )
      ctx.addIssue({
        code: "custom",
        path: ["lastVerified"],
        message: "Verified rule packs need a source and a non-future verification date",
      });
  });

export const schemas = {
  players: playerSchema,
  coaches: coachSchema,
  clubs: clubSchema,
  opportunities: opportunitySchema,
  mandates: mandateSchema,
  pipeline: pipelineSchema,
  rules: ruleSchema,
};
export function parseData(entity: Entity, value: unknown) {
  return schemas[entity].parse(value);
}

export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const passwordSchema = z.string().min(12, "Use at least 12 characters").max(128);
export const newUserSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    name,
    password: passwordSchema,
    role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
  })
  .strict();
