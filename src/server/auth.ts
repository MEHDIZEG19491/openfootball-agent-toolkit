import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { User } from "../core/types";
import { getRepository, DomainError, type Repository } from "./database";
import { digest, hashPassword, verifyPassword } from "./security";
import { newUserSchema, passwordSchema } from "../core/schemas";

export function sessionUser(
  token: string | undefined,
  repo = getRepository(),
): User | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = repo.db
    .prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?")
    .get(digest(token), new Date().toISOString());
  return result ? repo.user(String(result.user_id)) : null;
}

export async function createUser(
  input: unknown,
  actor: string | null,
  repo = getRepository(),
): Promise<User> {
  const data = newUserSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  const id = randomUUID();
  try {
    repo.db
      .prepare("INSERT INTO users VALUES(?,?,?,?,?,?)")
      .run(id, data.email, data.name, data.role, passwordHash, new Date().toISOString());
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new DomainError("emailExists", 409);
    throw error;
  }
  repo.audit(actor, "create_user", "users", id);
  return repo.user(id)!;
}

export async function bootstrap(
  input: { email: string; name: string; password: string; token: string },
  repo = getRepository(),
) {
  const configured = process.env.BOOTSTRAP_TOKEN;
  if (
    !configured ||
    configured.length < 32 ||
    configured.startsWith("replace-") ||
    !timingSafeEqual(Buffer.from(digest(configured)), Buffer.from(digest(input.token)))
  )
    throw new DomainError("setupRejected", 403);
  const data = newUserSchema.parse({
    email: input.email,
    name: input.name,
    password: input.password,
    role: "OWNER",
  });
  if (repo.users().length) throw new DomainError("setupClosed", 409);
  const passwordHash = await hashPassword(data.password);
  return repo.transaction(() => {
    if (repo.users().length) throw new DomainError("setupClosed", 409);
    const id = randomUUID();
    repo.db
      .prepare("INSERT INTO users VALUES(?,?,?,?,?,?)")
      .run(id, data.email, data.name, "OWNER", passwordHash, new Date().toISOString());
    repo.audit(id, "setup");
    return repo.user(id)!;
  });
}

export async function login(
  email: string,
  password: string,
  repo = getRepository(),
): Promise<string> {
  const key = digest(email.toLowerCase());
  const now = new Date();
  repo.db
    .prepare("DELETE FROM login_attempts WHERE updated_at<?")
    .run(new Date(now.valueOf() - 86_400_000).toISOString());
  const attempt = repo.db
    .prepare("SELECT failures,blocked_until,updated_at FROM login_attempts WHERE key=?")
    .get(key);
  if (attempt?.blocked_until && String(attempt.blocked_until) > now.toISOString())
    throw new DomainError("tryLater", 429);
  const record = repo.db
    .prepare("SELECT id,password_hash FROM users WHERE email=? COLLATE NOCASE")
    .get(email);
  const correct = await verifyPassword(
    password,
    record?.password_hash as string | undefined,
  );
  if (!correct) {
    // Re-read after the asynchronous hash: concurrent failures must not erase
    // one another's counters. The transaction contains no asynchronous work.
    repo.transaction(() => {
      const attempt = repo.db
        .prepare("SELECT failures,updated_at FROM login_attempts WHERE key=?")
        .get(key);
      const fresh =
        attempt && now.valueOf() - Date.parse(String(attempt.updated_at)) < 900_000;
      const failures = fresh ? Number(attempt.failures) + 1 : 1;
      const blocked =
        failures >= 5 ? new Date(now.valueOf() + 900_000).toISOString() : null;
      repo.db
        .prepare(
          "INSERT INTO login_attempts(key,failures,blocked_until,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at",
        )
        .run(key, failures, blocked, now.toISOString());
    });
    throw new DomainError("invalidCredentials", 401);
  }
  const token = randomBytes(32).toString("hex");
  repo.transaction(() => {
    const current = repo.db
      .prepare("SELECT password_hash FROM users WHERE id=?")
      .get(String(record!.id));
    if (current?.password_hash !== record!.password_hash)
      throw new DomainError("invalidCredentials", 401);
    repo.db
      .prepare("DELETE FROM login_attempts WHERE key=? OR updated_at<?")
      .run(key, new Date(now.valueOf() - 86_400_000).toISOString());
    repo.db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now.toISOString());
    repo.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(
        digest(token),
        String(record!.id),
        new Date(now.valueOf() + 86_400_000).toISOString(),
      );
    repo.audit(String(record!.id), "login");
  });
  return token;
}

export function logout(token: string | undefined, repo = getRepository()) {
  if (token)
    repo.db.prepare("DELETE FROM sessions WHERE token_hash=?").run(digest(token));
}
export async function changePassword(
  user: User,
  current: string,
  replacement: string,
  repo: Repository = getRepository(),
) {
  passwordSchema.parse(replacement);
  const record = repo.db
    .prepare("SELECT password_hash FROM users WHERE id=?")
    .get(user.id);
  if (!(await verifyPassword(current, String(record?.password_hash))))
    throw new DomainError("invalidCredentials", 401);
  const encoded = await hashPassword(replacement);
  repo.transaction(() => {
    const result = repo.db
      .prepare("UPDATE users SET password_hash=? WHERE id=? AND password_hash=?")
      .run(encoded, user.id, String(record?.password_hash));
    if (result.changes !== 1) throw new DomainError("invalidCredentials", 401);
    repo.db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
    repo.audit(user.id, "change_password");
  });
}
