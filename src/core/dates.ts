export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Calendar age in UTC, evaluated on a supplied date for reproducibility. */
export function ageOn(birth: string | null, asOf: string): number | null {
  if (!birth || !isDate(birth) || !isDate(asOf) || birth > asOf) return null;
  const age = Number(asOf.slice(0, 4)) - Number(birth.slice(0, 4));
  return age - (asOf.slice(5) < birth.slice(5) ? 1 : 0);
}

export function daysUntil(date: string, asOf: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000,
  );
}
