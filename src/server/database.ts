import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { entities, type Entity, type Records, type User, type Role } from "../core/types";
import { parseData } from "../core/schemas";

export class DomainError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

const migration = `
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('OWNER','EDITOR','VIEWER')), password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, blocked_until TEXT, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS login_attempts_age ON login_attempts(updated_at);
CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('players','coaches','clubs','opportunities','mandates','pipeline','rules')), data TEXT NOT NULL CHECK(json_valid(data)), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT);
CREATE INDEX IF NOT EXISTS records_kind ON records(kind, archived_at, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_pair ON records(json_extract(data,'$.playerId'),json_extract(data,'$.opportunityId')) WHERE kind='pipeline' AND archived_at IS NULL;
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity TEXT, record_id TEXT, created_at TEXT NOT NULL);
`;

export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;",
  );
  if (path !== ":memory:") chmodSync(path, 0o600);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(migration);
    db.prepare(
      "INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(1,?)",
    ).run(new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    db.close();
    throw error;
  }
  return db;
}

type Stored = {
  id: string;
  kind: Entity;
  data: string;
  version: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
function decode<E extends Entity>(row: Stored): Records[E] {
  return {
    ...JSON.parse(row.data),
    id: row.id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export class Repository {
  constructor(public db: DatabaseSync) {}
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  list<E extends Entity>(entity: E, archived = false): Records[E][] {
    const rows = this.db
      .prepare(
        `SELECT * FROM records WHERE kind=? AND archived_at IS ${archived ? "NOT " : ""}NULL ORDER BY updated_at DESC`,
      )
      .all(entity) as unknown as Stored[];
    return rows.map((row) => decode<E>(row));
  }
  get<E extends Entity>(entity: E, id: string): Records[E] | null {
    const row = this.db
      .prepare("SELECT * FROM records WHERE kind=? AND id=? AND archived_at IS NULL")
      .get(entity, id) as unknown as Stored | undefined;
    return row ? decode<E>(row) : null;
  }
  count(): number {
    return Number(
      this.db
        .prepare("SELECT count(*) AS n FROM records WHERE archived_at IS NULL")
        .get()!.n,
    );
  }
  validateReferences(entity: Entity, data: Record<string, unknown>) {
    const references: [string, Entity][] =
      entity === "players"
        ? [["clubId", "clubs"]]
        : entity === "opportunities"
          ? [
              ["clubId", "clubs"],
              ["ruleId", "rules"],
            ]
          : entity === "mandates"
            ? [["playerId", "players"]]
            : entity === "pipeline"
              ? [
                  ["playerId", "players"],
                  ["opportunityId", "opportunities"],
                ]
              : [];
    for (const [field, target] of references)
      if (data[field] && !this.get(target, String(data[field])))
        throw new DomainError("referenceNotFound");
  }
  create<E extends Entity>(
    entity: E,
    input: unknown,
    actor: string,
    id: string = randomUUID(),
  ): Records[E] {
    const data = parseData(entity, input);
    this.validateReferences(entity, data);
    const now = new Date().toISOString();
    try {
      this.db
        .prepare(
          "INSERT INTO records(id,kind,data,created_at,updated_at) VALUES(?,?,?,?,?)",
        )
        .run(id, entity, JSON.stringify(data), now, now);
    } catch (error) {
      if (String(error).includes("UNIQUE")) throw new DomainError("duplicateRecord", 409);
      throw error;
    }
    this.audit(actor, "create", entity, id);
    return this.get(entity, id)!;
  }
  update<E extends Entity>(
    entity: E,
    id: string,
    input: unknown,
    version: number,
    actor: string,
  ): Records[E] {
    const data = parseData(entity, input);
    return this.transaction(() => {
      this.validateReferences(entity, data);
      const record = this.get(entity, id);
      if (!record) throw new DomainError("notFound", 404);
      if (record.version !== version) throw new DomainError("versionConflict", 409);
      try {
        this.db
          .prepare(
            "UPDATE records SET data=?,version=version+1,updated_at=? WHERE id=? AND kind=? AND version=?",
          )
          .run(JSON.stringify(data), new Date().toISOString(), id, entity, version);
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          throw new DomainError("duplicateRecord", 409);
        throw error;
      }
      this.audit(actor, "update", entity, id);
      return this.get(entity, id)!;
    });
  }
  archive(entity: Entity, id: string, version: number, actor: string) {
    return this.transaction(() => {
      const record = this.get(entity, id);
      if (!record) throw new DomainError("notFound", 404);
      if (record.version !== version) throw new DomainError("versionConflict", 409);
      const dependents: [Entity, string][] =
        entity === "clubs"
          ? [
              ["players", "clubId"],
              ["opportunities", "clubId"],
            ]
          : entity === "players"
            ? [
                ["mandates", "playerId"],
                ["pipeline", "playerId"],
              ]
            : entity === "opportunities"
              ? [["pipeline", "opportunityId"]]
              : entity === "rules"
                ? [["opportunities", "ruleId"]]
                : [];
      for (const [kind, field] of dependents) {
        if (
          this.db
            .prepare(
              "SELECT id FROM records WHERE kind=? AND archived_at IS NULL AND json_extract(data,?)=? LIMIT 1",
            )
            .get(kind, `$.${field}`, id)
        )
          throw new DomainError("recordInUse", 409);
      }
      const now = new Date().toISOString();
      this.db
        .prepare(
          "UPDATE records SET archived_at=?,updated_at=?,version=version+1 WHERE id=?",
        )
        .run(now, now, id);
      this.audit(actor, "archive", entity, id);
    });
  }
  audit(actor: string | null, action: string, entity?: string, id?: string) {
    this.db
      .prepare("INSERT INTO audit_events VALUES(?,?,?,?,?,?)")
      .run(
        randomUUID(),
        actor,
        action,
        entity ?? null,
        id ?? null,
        new Date().toISOString(),
      );
  }
  users(): User[] {
    const rows = this.db
      .prepare(
        "SELECT id,email,name,role,created_at AS createdAt FROM users ORDER BY created_at",
      )
      .all() as unknown as User[];
    return rows.map((row) => ({ ...row }));
  }
  user(id: string): User | null {
    const row = this.db
      .prepare("SELECT id,email,name,role,created_at AS createdAt FROM users WHERE id=?")
      .get(id) as unknown as User | undefined;
    // node:sqlite returns null-prototype objects; React Server Components
    // require plain objects at the client boundary.
    return row ? { ...row } : null;
  }
  changeRole(id: string, role: Role, actor: string) {
    this.transaction(() => {
      const user = this.user(id);
      if (!user) throw new DomainError("notFound", 404);
      if (
        user.role === "OWNER" &&
        role !== "OWNER" &&
        this.users().filter((u) => u.role === "OWNER").length <= 1
      )
        throw new DomainError("lastOwner", 409);
      this.db.prepare("UPDATE users SET role=? WHERE id=?").run(role, id);
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
      this.audit(actor, "change_role", "users", id);
    });
  }
}

let repository: Repository | undefined;
export function getRepository() {
  return (repository ??= new Repository(
    openDatabase(process.env.DATABASE_PATH || resolve("data/openfootball.sqlite")),
  ));
}
export function isEntity(value: string): value is Entity {
  return entities.includes(value as Entity);
}
