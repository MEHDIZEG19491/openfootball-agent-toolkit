import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Repository, openDatabase, DomainError } from "../src/server/database";
import {
  bootstrap,
  login,
  logout,
  sessionUser,
  changePassword,
} from "../src/server/auth";
import {
  hashPassword,
  verifyPassword,
  digest,
  assertSameOrigin,
  appOrigin,
  readJson,
  cookieToken,
  sessionCookie,
} from "../src/server/security";

const password = "Fictional-test-password-123!";
test("salted passwords verify without retaining the plaintext", async () => {
  const first = await hashPassword(password),
    second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword(password, "broken"), false);
});
test("bootstrap closes permanently; session hashes and revocation protect login", async (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  const previous = process.env.BOOTSTRAP_TOKEN;
  process.env.BOOTSTRAP_TOKEN = randomBytes(32).toString("hex");
  t.after(() => {
    if (previous === undefined) delete process.env.BOOTSTRAP_TOKEN;
    else process.env.BOOTSTRAP_TOKEN = previous;
  });
  const input = {
    email: "owner@example.test",
    name: "Test Owner",
    password,
    token: process.env.BOOTSTRAP_TOKEN,
  };
  await assert.rejects(bootstrap({ ...input, token: "wrong" }, repo), /setupRejected/);
  const user = await bootstrap(input, repo);
  await assert.rejects(bootstrap(input, repo), /setupClosed/);
  const token = await login(input.email.toUpperCase(), password, repo);
  assert.equal(sessionUser(token, repo)?.id, user.id);
  assert.equal(sessionUser("forged", repo), null);
  assert.equal(
    repo.db.prepare("SELECT token_hash FROM sessions").get()!.token_hash,
    digest(token),
  );
  logout(token, repo);
  assert.equal(sessionUser(token, repo), null);
  const next = await login(input.email, password, repo);
  await changePassword(user, password, "A-new-fictional-password-456!", repo);
  assert.equal(sessionUser(next, repo), null);
  await assert.rejects(login(input.email, password, repo), /invalidCredentials/);
  assert.ok(await login(input.email, "A-new-fictional-password-456!", repo));
});
test("parallel invalid logins count independently and lock after five failures", async (t) => {
  const repo = new Repository(openDatabase(":memory:"));
  t.after(() => repo.db.close());
  for (let round = 0; round < 2; round++) {
    const results = await Promise.allSettled([
      login("absent@example.test", password, repo),
      login("absent@example.test", password, repo),
    ]);
    assert.ok(
      results.every(
        (r) =>
          r.status === "rejected" &&
          r.reason instanceof DomainError &&
          r.reason.status === 401,
      ),
    );
  }
  assert.equal(repo.db.prepare("SELECT failures FROM login_attempts").get()!.failures, 4);
  await assert.rejects(
    login("absent@example.test", password, repo),
    /invalidCredentials/,
  );
  await assert.rejects(
    login("absent@example.test", password, repo),
    (e) => e instanceof DomainError && e.status === 429,
  );
  assert.equal(
    repo.db.prepare("SELECT key FROM login_attempts").get()!.key,
    digest("absent@example.test"),
  );
});
test("mutations need the exact trusted origin, JSON and same-origin fetch metadata", () => {
  const old = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://workspace.example.test";
  try {
    const req = (origin: string, site = "same-origin", type = "application/json") =>
      new Request("https://workspace.example.test/api/records/players", {
        method: "POST",
        headers: { origin, "sec-fetch-site": site, "content-type": type },
        body: "{}",
      });
    assert.doesNotThrow(() => assertSameOrigin(req(appOrigin())));
    assert.throws(
      () => assertSameOrigin(req("https://attacker.example.test")),
      /originRejected/,
    );
    assert.throws(
      () => assertSameOrigin(req(appOrigin(), "cross-site")),
      /originRejected/,
    );
    assert.throws(
      () => assertSameOrigin(req(appOrigin(), "same-origin", "text/plain")),
      /jsonRequired/,
    );
    assert.match(
      sessionCookie("a".repeat(64)),
      /HttpOnly; SameSite=Strict; Max-Age=86400; Secure/,
    );
    process.env.APP_ORIGIN = "http://public.example.test";
    assert.throws(() => appOrigin(), /HTTPS/);
    process.env.APP_ORIGIN = "ftp://localhost";
    assert.throws(() => appOrigin(), /HTTPS/);
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
});
test("bounded streaming JSON rejects oversized or malformed input; cookies reject injection", async () => {
  const req = (body: string) =>
    new Request("http://localhost/", { method: "POST", body });
  assert.deepEqual(await readJson(req('{"name":"example"}')), {
    name: "example",
  });
  await assert.rejects(readJson(req("bad-json")), /invalidJson/);
  await assert.rejects(
    readJson(req('"' + "a".repeat(20) + '"'), 10),
    (e) => e instanceof DomainError && e.status === 413,
  );
  const token = "a".repeat(64);
  assert.equal(
    cookieToken(
      new Request("http://localhost", {
        headers: { cookie: `x=1; ofat_session=${token}` },
      }),
    ),
    token,
  );
  assert.equal(
    cookieToken(
      new Request("http://localhost", {
        headers: { cookie: "ofat_session=<script>" },
      }),
    ),
    undefined,
  );
});
