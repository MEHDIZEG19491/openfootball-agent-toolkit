import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Starts the real production Next server with a disposable database. No browser
// automation or private installation data is used.
test(
  "production HTTP: setup, sessions, localized pages, CRUD, matching, import and RBAC",
  { timeout: 90000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "ofat-http-"));
    const token = randomBytes(32).toString("hex");
    const port = 18000 + Math.floor(Math.random() * 10000),
      origin = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, [".next/standalone/server.js"], {
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        DATABASE_PATH: join(directory, "test.sqlite"),
        BOOTSTRAP_TOKEN: token,
        APP_ORIGIN: origin,
        COOKIE_SECURE: "false",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    server.stdout.on("data", (c) => (output += c));
    server.stderr.on("data", (c) => (output += c));
    t.after(async () => {
      server.kill("SIGTERM");
      await Promise.race([new Promise((r) => server.once("exit", r)), delay(5000)]);
      if (server.exitCode === null) server.kill("SIGKILL");
      await rm(directory, { recursive: true, force: true });
    });
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try {
        if ((await fetch(origin + "/api/health")).ok) {
          ready = true;
          break;
        }
      } catch {}
      if (server.exitCode !== null) break;
      await delay(200);
    }
    assert.ok(ready, output);
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      cookie = "",
      extra: Record<string, string> = {},
    ) =>
      fetch(origin + path, {
        method,
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: cookie,
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const password = "HTTP-fictional-password-123!",
      email = "owner@example.test";
    assert.equal((await request("/api/records/players")).status, 401);
    assert.equal((await request("/players")).status, 307);
    assert.equal(
      (
        await request("/api/auth/setup", "POST", {
          email,
          name: "Owner Example",
          password,
          token: "wrong",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/api/auth/setup", "POST", {
          email,
          name: "Owner Example",
          password,
          token,
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await request("/api/auth/setup", "POST", {
          email,
          name: "Other Owner",
          password,
          token,
        })
      ).status,
      409,
    );
    const auth = await request("/api/auth/login", "POST", { email, password });
    assert.equal(auth.status, 200);
    const owner = auth.headers.get("set-cookie")!.split(";")[0];
    assert.match(auth.headers.get("set-cookie")!, /HttpOnly; SameSite=Strict/);
    const home = await request("/", "GET", undefined, owner + "; ofat_locale=ar");
    assert.equal(home.status, 200, output);
    const html = await home.text();
    assert.match(html, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
    const csp = home.headers.get("content-security-policy")!;
    assert.ok(csp);
    assert.ok(!csp.includes("unsafe-inline"));
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    assert.ok(html.includes(`nonce="${nonce}"`));
    const assets = new Set(
      [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+)(?:\?[^\"]*)?"/g)].map(
        (match) => match[1],
      ),
    );
    assert.ok(assets.size > 0, "Production HTML must reference browser assets");
    for (const asset of assets) {
      const response = await request(asset);
      assert.equal(response.status, 200, `Standalone asset unavailable: ${asset}`);
    }
    assert.match(home.headers.get("cache-control")!, /no-store/);
    assert.ok(
      !(await request("/", "GET", undefined, owner)).headers
        .get("content-security-policy")!
        .includes(nonce),
    );
    for (const section of [
      "players",
      "coaches",
      "clubs",
      "opportunities",
      "pipeline",
      "mandates",
      "rules",
      "matches",
      "help",
      "settings",
    ]) {
      assert.equal(
        (await request("/" + section, "GET", undefined, owner + "; ofat_locale=fr"))
          .status,
        200,
        section,
      );
    }
    assert.equal(
      (
        await request(
          "/api/records/players",
          "POST",
          { name: "Rejected Example" },
          owner,
          { Origin: "https://attacker.example.test" },
        )
      ).status,
      403,
    );
    const added = await request(
      "/api/records/players",
      "POST",
      {
        name: "Fictional Forward",
        positions: ["ST"],
        dateOfBirth: "2003-01-01",
        availability: "FREE_AGENT",
      },
      owner,
    );
    assert.equal(added.status, 201);
    const player = (await added.json()).record;
    const oppResponse = await request(
      "/api/records/opportunities",
      "POST",
      {
        title: "Fictional Striker Search",
        country: "XX",
        positions: ["ST"],
        maximumAge: 30,
        requiredAvailability: ["FREE_AGENT"],
      },
      owner,
    );
    assert.equal(oppResponse.status, 201);
    const opportunity = (await oppResponse.json()).record;
    const matches = await request(
      `/api/matches?opportunityId=${opportunity.id}&asOf=2026-09-07`,
      "GET",
      undefined,
      owner,
    );
    assert.equal(matches.status, 200);
    const result = (await matches.json()).results[0].result;
    assert.equal(result.eligibility, "MATCH");
    assert.equal(result.score, 100);
    const patch = { name: "Fictional Forward Updated" };
    assert.equal(
      (
        await request(
          `/api/records/players/${player.id}`,
          "PATCH",
          { version: 1, data: patch },
          owner,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          `/api/records/players/${player.id}`,
          "PATCH",
          { version: 1, data: patch },
          owner,
        )
      ).status,
      409,
    );
    const payload = {
      format: "json",
      content: JSON.stringify([{ name: "Fictional Coach", languages: ["fr", "ar"] }]),
    };
    assert.equal(
      (await request("/api/import/coaches", "POST", payload, owner)).status,
      200,
    );
    assert.equal(
      (await (await request("/api/records/coaches", "GET", undefined, owner)).json())
        .records.length,
      0,
    );
    assert.equal(
      (await request("/api/import/coaches", "POST", { ...payload, dryRun: false }, owner))
        .status,
      201,
    );
    const exported = await request(
      "/api/export/coaches?format=csv",
      "GET",
      undefined,
      owner,
    );
    assert.equal(exported.status, 200);
    assert.match(await exported.text(), /Fictional Coach/);
    for (const role of ["VIEWER", "EDITOR"]) {
      const address = role.toLowerCase() + "@example.test";
      const response = await request(
        "/api/users",
        "POST",
        { email: address, name: role + " Example", role, password },
        owner,
      );
      assert.equal(response.status, 201);
      const uid = (await response.json()).user.id;
      const logged = await request("/api/auth/login", "POST", {
        email: address,
        password,
      });
      const cookie = logged.headers.get("set-cookie")!.split(";")[0];
      assert.equal(
        (await request("/api/records/players", "GET", undefined, cookie)).status,
        200,
      );
      assert.equal((await request("/api/users", "GET", undefined, cookie)).status, 403);
      assert.equal((await request("/api/records/rules", "POST", {}, cookie)).status, 403);
      assert.equal(
        (
          await request(
            "/api/records/clubs",
            "POST",
            { name: "Fictional Club " + role, country: "XX" },
            cookie,
          )
        ).status,
        role === "EDITOR" ? 201 : 403,
      );
      assert.equal(
        (await request("/api/export/players", "GET", undefined, cookie)).status,
        role === "EDITOR" ? 200 : 403,
      );
      assert.equal(
        (await request(`/api/users/${uid}`, "PATCH", { role: "VIEWER" }, owner)).status,
        200,
      );
      assert.equal(
        (await request("/api/records/players", "GET", undefined, cookie)).status,
        401,
      );
    }
    assert.equal(
      (
        await request(
          "/api/auth/password",
          "POST",
          { current: password, replacement: "HTTP-replacement-password-456!" },
          owner,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("/api/records/players", "GET", undefined, owner)).status,
      401,
    );
    assert.equal(
      (await request("/api/auth/login", "POST", { email, password })).status,
      401,
    );
    assert.equal(
      (
        await request("/api/auth/login", "POST", {
          email,
          password: "HTTP-replacement-password-456!",
        })
      ).status,
      200,
    );
    assert.ok(!output.includes("API request failed"), output);
  },
);
