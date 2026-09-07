import { z } from "zod";
import { can, type Permission } from "@/core/permissions";
import { loginSchema, newUserSchema, passwordSchema } from "@/core/schemas";
import { matchPlayer } from "@/core/matching";
import { isDate, todayUTC } from "@/core/dates";
import { getRepository, DomainError, isEntity } from "@/server/database";
import {
  sessionUser,
  login,
  logout,
  bootstrap,
  createUser,
  changePassword,
} from "@/server/auth";
import {
  assertSameOrigin,
  cookieToken,
  readJson,
  sessionCookie,
} from "@/server/security";
import { commitImport, exportRecords, prepareImport } from "@/server/imports";
import { loadDemo } from "@/server/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

async function handle(request: Request, context: Context): Promise<Response> {
  try {
    const { path } = await context.params;
    const repo = getRepository();
    const method = request.method;
    const url = new URL(request.url);
    if (path.length === 1 && path[0] === "health" && method === "GET") {
      repo.db.prepare("SELECT 1").get();
      return json({ status: "ok", version: "0.1.0" });
    }
    if (method !== "GET") assertSameOrigin(request);
    if (path.join("/") === "auth/login" && method === "POST") {
      const { email, password } = loginSchema.parse(await readJson(request));
      const token = await login(email, password, repo);
      return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
    }
    if (path.join("/") === "auth/setup" && method === "POST") {
      const input = z
        .object({
          email: z.email().max(254),
          name: z.string().min(2).max(160),
          password: passwordSchema,
          token: z.string().min(1).max(256),
        })
        .strict()
        .parse(await readJson(request));
      await bootstrap(input, repo);
      return json({ ok: true }, 201);
    }
    const token = cookieToken(request);
    const user = sessionUser(token, repo);
    if (!user) throw new DomainError("unauthorized", 401);
    const requirePermission = (permission: Permission) => {
      if (!can(user.role, permission)) throw new DomainError("forbidden", 403);
    };
    if (path.join("/") === "auth/logout" && method === "POST") {
      logout(token, repo);
      return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
    }
    if (path.join("/") === "auth/password" && method === "POST") {
      const input = z
        .object({ current: z.string().max(128), replacement: passwordSchema })
        .strict()
        .parse(await readJson(request));
      await changePassword(user, input.current, input.replacement, repo);
      return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
    }
    if (path[0] === "users") {
      requirePermission("users");
      if (path.length === 1 && method === "GET") return json({ users: repo.users() });
      if (path.length === 1 && method === "POST")
        return json(
          {
            user: await createUser(
              newUserSchema.parse(await readJson(request)),
              user.id,
              repo,
            ),
          },
          201,
        );
      if (path.length === 2 && method === "PATCH") {
        const input = z
          .object({ role: z.enum(["OWNER", "EDITOR", "VIEWER"]) })
          .strict()
          .parse(await readJson(request));
        repo.changeRole(z.uuid().parse(path[1]), input.role, user.id);
        return json({ ok: true });
      }
    }
    if (path.length === 1 && path[0] === "demo" && method === "POST") {
      requirePermission("users");
      loadDemo(repo, user.id);
      return json({ ok: true }, 201);
    }
    if (
      path[0] === "records" &&
      path.length >= 2 &&
      path.length <= 3 &&
      isEntity(path[1])
    ) {
      const entity = path[1];
      const id = path[2] ? z.uuid().parse(path[2]) : null;
      if (method === "GET") {
        if (id) {
          const record = repo.get(entity, id);
          if (!record) throw new DomainError("notFound", 404);
          return json({ record });
        }
        return json({ records: repo.list(entity) });
      }
      requirePermission(entity === "rules" ? "rules" : "write");
      if (method === "POST" && !id) {
        const input = await readJson(request, 128_000);
        return json(
          {
            record: repo.transaction(() => repo.create(entity, input, user.id)),
          },
          201,
        );
      }
      if (method === "PATCH" && id) {
        const { data, version } = z
          .object({ data: z.unknown(), version: z.number().int().positive() })
          .strict()
          .parse(await readJson(request, 128_000));
        return json({
          record: repo.update(entity, id, data, version, user.id),
        });
      }
      if (method === "DELETE" && id) {
        const { version } = z
          .object({ version: z.number().int().positive() })
          .strict()
          .parse(await readJson(request));
        repo.archive(entity, id, version, user.id);
        return json({ ok: true });
      }
    }
    if (
      path[0] === "import" &&
      path.length === 2 &&
      isEntity(path[1]) &&
      method === "POST"
    ) {
      const entity = path[1];
      requirePermission(entity === "rules" ? "rules" : "write");
      const input = z
        .object({
          format: z.enum(["csv", "json"]),
          content: z.string(),
          dryRun: z.boolean().default(true),
        })
        .strict()
        .parse(await readJson(request, 1_150_000));
      const rows = prepareImport(entity, input.content, input.format);
      // Preview includes reference checks, so a confirmed import cannot silently lose relationships.
      for (const row of rows) repo.validateReferences(entity, row.data);
      if (input.dryRun)
        return json({
          count: rows.length,
          preview: rows.slice(0, 5).map((r) => r.data),
        });
      const records = commitImport(repo, entity, rows, user.id);
      return json({ count: records.length }, 201);
    }
    if (
      path[0] === "export" &&
      path.length === 2 &&
      isEntity(path[1]) &&
      method === "GET"
    ) {
      requirePermission("export");
      const entity = path[1];
      const format = z
        .enum(["csv", "json"])
        .parse(url.searchParams.get("format") ?? "csv");
      repo.audit(user.id, "export", entity);
      return new Response(exportRecords(entity, repo.list(entity), format), {
        headers: {
          "Content-Type":
            format === "csv"
              ? "text/csv; charset=utf-8"
              : "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="openfootball-${entity}.${format}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path.length === 1 && path[0] === "matches" && method === "GET") {
      const opportunity = repo.get(
        "opportunities",
        z.uuid().parse(url.searchParams.get("opportunityId")),
      );
      if (!opportunity) throw new DomainError("notFound", 404);
      const asOf = url.searchParams.get("asOf") ?? todayUTC();
      if (!isDate(asOf)) throw new DomainError("invalidDate");
      const rule = opportunity.ruleId ? repo.get("rules", opportunity.ruleId) : null;
      const results = repo
        .list("players")
        .map((player) => ({
          player,
          result: matchPlayer(player, opportunity, asOf, rule),
        }))
        .sort((a, b) => b.result.score - a.result.score);
      return json({ opportunity, results });
    }
    throw new DomainError("notFound", 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: "validationFailed",
          issues: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    if (error instanceof DomainError)
      return json(
        { error: error.code },
        error.status,
        error.status === 429 ? { "Retry-After": "900" } : {},
      );
    if (error instanceof SyntaxError) return json({ error: "invalidJson" }, 400);
    console.error(
      "API request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json({ error: "serverError" }, 500);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
