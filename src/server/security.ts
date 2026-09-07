import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { DomainError } from "./database";

const params = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let hashing = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (hashing >= 2) throw new DomainError("tryLater", 429);
  hashing++;
  try {
    return await new Promise((resolve, reject) =>
      scrypt(password, salt, 64, params, (error, key) =>
        error ? reject(error) : resolve(key),
      ),
    );
  } finally {
    hashing--;
  }
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(
  password: string,
  encoded?: string,
): Promise<boolean> {
  const parts = encoded?.split("$");
  const valid =
    parts?.length === 3 &&
    parts[0] === "scrypt-v1" &&
    /^[a-f0-9]{32}$/.test(parts[1]) &&
    /^[a-f0-9]{128}$/.test(parts[2]);
  const salt = valid ? parts![1] : "00000000000000000000000000000000";
  const actual = await derive(password, salt);
  const expected = valid ? Buffer.from(parts![2], "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && !!valid;
}
export function appOrigin(): string {
  const url = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol) ||
    (!local && url.protocol !== "https:")
  )
    throw new Error("APP_ORIGIN must be an HTTPS origin, except on loopback");
  return url.origin;
}
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    throw new DomainError("originRejected", 403);
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site))
    throw new DomainError("originRejected", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new DomainError("jsonRequired", 415);
}
export async function readJson(request: Request, limit = 16_384): Promise<unknown> {
  if (!request.body) throw new DomainError("invalidJson");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new DomainError("tooLarge", 413);
      }
      chunks.push(result.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("invalidJson");
  }
}

export const sessionCookieName = "ofat_session";
export function sessionCookie(token: string, maxAge = 60 * 60 * 24): string {
  const secure =
    new URL(appOrigin()).protocol === "https:" || process.env.COOKIE_SECURE === "true";
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
export function cookieToken(request: Request): string | undefined {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : undefined;
}
