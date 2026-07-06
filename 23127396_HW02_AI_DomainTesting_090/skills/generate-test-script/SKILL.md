---
name: generate-test-script
description: >-
  Generate an executable test harness (Node.js, no external deps) from a
  Markdown test-design report whose cases have IDs, endpoints, requests,
  preconditions, and spec-anchored Expected results (e.g.
  docs/test-design-report.md). Use when someone says "generate a test script /
  automate these test cases / turn the test design into runnable tests". Emits a
  case registry + runner. Pairs with the run-tests-and-report skill.
---

# Generate Test Script (from a test-design report)

Turn a spec-anchored **test-design report** into a runnable, dependency-free **Node.js** harness.
Each design case becomes one executable case that drives the real API and checks the observed
result against the **spec Expected** already written in the report.

## Guardrails (read first)

1. **Tests encode the SPEC, not the implementation.** The Expected column of the report is the
   oracle. On a deliberately-buggy SUT this means **a FAIL is a *candidate bug*, not a broken
   test** — never weaken an assertion to make it pass, and never "fix" the SUT.
2. **Do not invent expectations.** Copy each case's Expected verbatim from the report and encode
   exactly that. If a case is `spec-undefined`/`spec-ambiguous`, generate it as a **probe**
   (record actual, no hard assert).
3. **Not everything is API-automatable.** Classify each case (below). UI-only checks (rendered
   `<h1>` count, `alt` text, "no script executes", loading spinner) become **manual** entries
   with instructions — don't fake them with a green assertion.
4. **Deterministic fixtures.** Any case with a write precondition ("reset", "1 prior use",
   "order in `shipping`") must carry explicit setup so runs are repeatable. State comes from
   fixtures, never from a previous case's side effects.
5. **No secrets in code beyond the documented seed creds.** Tokens are fetched at runtime via
   `POST /api/login`.

## Inputs → Outputs

- **Input:** a Markdown report (default `docs/test-design-report.md`) + the Environment/§2 block
  (base URL, seed accounts, seed data) and the per-feature case tables.
- **Output:**
  - `tests/cases.mjs` — the case registry (one object per report row).
  - `tests/harness.mjs` — helpers: `login`, `api`, `resetDb`, fixture builders.
  - `tests/runner.mjs` — executes cases, writes `tests/results.json` (consumed by
    `run-tests-and-report`).
  - `tests/README.md` — how to run + the manual-case checklist.

## Method — 5 steps

### Step 1 — Parse the report into rows
For every case row across all feature tables capture: `id` (prefix with feature →
`FR09-BVA-02`), `feature`, `technique` (domain/bva), `endpoint/method`, `input/request`,
`precondition`, `expected` (verbatim), `probes/rationale`. Also read §2 for base URL + seed data.

### Step 2 — Classify each case
- **auto** — result is observable over HTTP (status code, JSON body/fields, row set). Most of
  FR-09, FR-10, FR-14, and the API side of FR-05.
- **manual** — needs a browser/DOM/visual (FR-05 R2/R3/R6/R8: alt text, `₫` format, loading
  state, single `<h1>`, "no JS executes"). Emit with step-by-step instructions + the Expected.
- **probe** — `spec-undefined`/`spec-ambiguous`: run the request, **record actual**, assert
  nothing; flag for human judgement.

### Step 3 — Derive the assertion from `Expected`
Translate the spec Expected into a concrete check. Common patterns for this SUT:

| Expected phrasing | Encoded assertion |
|-------------------|-------------------|
| "Apply; discount X; final Y" | `status 200 && body.discount_amount===X && body.final_amount===Y` |
| "Reject — below min / expired / limit / not admin" | `status>=400` **and**, when the report names it, the message/`error` substring |
| "Reject **403**" / "Reject **401**" | exact `status===403` / `401` |
| "0 results; must NOT return all products" | `Array.isArray(body) && body.length===0` (and ≠ full catalog) |
| "Deletes category N" / "Created" | `status 200` + follow-up GET reflects the change |
| "Each step succeeds; ends `delivered`" | drive the sequence; assert final `GET /orders/:id` status |
| "Reject — final / skip-ahead / backward" | `status>=400` on the transition call |

Encode each case's `run(ctx)` to return `{ actual, pass, reason }`. Keep the spec Expected string
on the case object so the report can show Expected vs Actual.

### Step 4 — Attach fixtures (setup) from `Precondition`
- **reset** → `ctx.resetDb()` (runs `node database.js`; destructive — see harness note).
- **login** → `ctx.tokens.admin` / `ctx.tokens.user` from `POST /api/login`.
- **coupon usage = N** → POST `/api/coupon-usage` N times (auth) for that coupon.
- **order in state S** → `ctx.makeOrder()` then drive via `PUT /api/admin/orders/:id/status`;
  a `canceled` order = cancel a fresh `pending` one.
- **temporary coupon (expiry edges)** → `POST /api/admin/coupons` with the needed `expired_at`.

### Step 5 — Emit the four files
Generate `cases.mjs`, `harness.mjs`, `runner.mjs`, `tests/README.md` using the templates below.
Cover **every** report row; count them and reconcile against §3 totals (e.g. 130) in the README.

## Templates

**`tests/harness.mjs`** (dependency-free; Node 18+ `fetch`):
```js
import { execSync } from "node:child_process";
export const BASE = process.env.ESHOP_API ?? "http://localhost:3000";
export async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null; const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, body: data };
}
export async function login(email, password) {
  const r = await api("POST", "/api/login", { body: { email, password } });
  if (r.status !== 200 || !r.body?.token) throw new Error(`login failed for ${email}: ${r.status}`);
  return { token: r.body.token, user: r.body.user };
}
// DESTRUCTIVE: drops + reseeds the SQLite DB. Requires the backend NOT to hold a lock,
// or a restart afterwards. Guarded so it only runs when explicitly enabled.
export function resetDb() {
  if (process.env.ESHOP_ALLOW_DB_RESET !== "1")
    return { skipped: true, reason: "set ESHOP_ALLOW_DB_RESET=1 to enable" };
  execSync("node database.js", { cwd: "backend", stdio: "ignore" });
  return { ok: true };
}
export async function makeContext() {
  const admin = await login("admin@eshop.com", "Admin123!");
  const user  = await login("test@eshop.com", "Test1234!");
  return { api, resetDb, tokens: { admin: admin.token, user: user.token }, ids: { user: user.user?.id ?? 2 } };
}
```

**`tests/cases.mjs`** (one object per report row; representative examples — generate ALL):
```js
export const cases = [
  { id: "FR09-BVA-02", feature: "FR-09", kind: "auto",
    expected: "Coupon applies; discount 30,000; final 270,000 (C3 >= inclusive)",
    async run(ctx) {
      const r = await ctx.api("POST", "/api/apply-coupon",
        { body: { code: "SAVE10", total_amount: 300000, user_id: ctx.ids.user } });
      const pass = r.status === 200 && r.body?.discount_amount === 30000 && r.body?.final_amount === 270000;
      return { actual: JSON.stringify(r.body), pass,
        reason: pass ? "" : `status ${r.status}, body ${JSON.stringify(r.body)}` };
    } },

  { id: "FR14-DT-05", feature: "FR-14", kind: "auto",
    expected: "Reject 403 — non-admin cannot create category (FR-12/SEC-03)",
    async run(ctx) {
      const r = await ctx.api("POST", "/api/categories",
        { token: ctx.tokens.user, body: { name: "Hợp lệ" } });
      const pass = r.status === 403;
      return { actual: `status ${r.status}`, pass, reason: pass ? "" : `got ${r.status}, expected 403` };
    } },

  { id: "FR10-BVA-04", feature: "FR-10", kind: "auto",
    expected: "Reject — canceled is final, canceled→delivered not allowed",
    async run(ctx) {
      const id = await ctx.makeOrder(ctx, "canceled");         // fixture builder in harness
      const r = await ctx.api("PUT", `/api/admin/orders/${id}/status`,
        { token: ctx.tokens.admin, body: { status: "delivered" } });
      const pass = r.status >= 400;
      return { actual: `status ${r.status}`, pass, reason: pass ? "" : "transition out of final state accepted" };
    } },

  { id: "FR05-BVA-10", feature: "FR-05", kind: "auto",
    expected: "search '%' is literal → 0 results; must NOT return all products",
    async run(ctx) {
      const r = await ctx.api("GET", "/api/products?search=" + encodeURIComponent("%"));
      const pass = Array.isArray(r.body) && r.body.length === 0;
      return { actual: `${Array.isArray(r.body) ? r.body.length : r.body} rows`, pass,
        reason: pass ? "" : "wildcard leaked: '%' matched everything" };
    } },

  { id: "FR05-DT-10", feature: "FR-05", kind: "manual",
    expected: "No script executes; search term escaped on screen (R5/SEC-04)",
    steps: "Search `<script>alert(1)</script>` in the web UI; confirm no alert fires and the term renders as literal text (DevTools → Elements)." },

  { id: "FR09-DT-14", feature: "FR-09", kind: "probe",
    expected: "spec-undefined — coupon code case-sensitivity",
    async run(ctx) {
      const r = await ctx.api("POST", "/api/apply-coupon",
        { body: { code: "save10", total_amount: 500000, user_id: ctx.ids.user } });
      return { actual: `status ${r.status}, ${JSON.stringify(r.body)}`, pass: null, reason: "record only" };
    } },
];
```

**`tests/runner.mjs`**:
```js
import { writeFileSync } from "node:fs";
import { makeContext } from "./harness.mjs";
import { cases } from "./cases.mjs";
const ctx = await makeContext();
const results = [];
for (const c of cases) {
  if (c.kind === "manual") { results.push({ id: c.id, feature: c.feature, kind: "manual",
    expected: c.expected, actual: "(manual)", status: "MANUAL", reason: c.steps ?? "" }); continue; }
  try {
    const r = await c.run(ctx);
    const status = c.kind === "probe" ? "PROBE" : (r.pass ? "PASS" : "FAIL");
    results.push({ id: c.id, feature: c.feature, kind: c.kind, expected: c.expected,
      actual: r.actual, status, reason: r.reason });
  } catch (e) {
    results.push({ id: c.id, feature: c.feature, kind: c.kind, expected: c.expected,
      actual: "ERROR", status: "ERROR", reason: String(e?.message ?? e) });
  }
}
writeFileSync("tests/results.json", JSON.stringify({ when: new Date().toISOString(), results }, null, 2));
const n = (s) => results.filter(r => r.status === s).length;
console.log(`PASS ${n("PASS")}  FAIL ${n("FAIL")}  MANUAL ${n("MANUAL")}  PROBE ${n("PROBE")}  ERROR ${n("ERROR")}`);
```

## Fixture builders to include in `harness.mjs`
- `makeOrder(ctx, targetState)` — checkout as user → `pending`; drive via admin status PUTs to
  reach `confirmed`/`shipping`/`delivered`; for `canceled`, cancel a fresh `pending` order.
  Returns the order id.
- `seedCouponUsage(ctx, code, n)` — look up coupon id (`GET /api/coupons` as admin), POST
  `/api/coupon-usage` n times as the user.
- `makeTempCoupon(ctx, { code, type, value, min, expired_at, max })` — `POST /api/admin/coupons`.

## Output checklist
- [ ] Every report row emitted as a case (count reconciled with §3 totals).
- [ ] Each auto case asserts the **spec Expected** verbatim; FAIL is framed as a candidate bug.
- [ ] Manual cases carry concrete UI steps; probes record actual with no hard assert.
- [ ] All stateful cases have explicit fixtures; DB reset is guarded behind an env flag.
- [ ] `tests/README.md` lists run order, env vars (`ESHOP_API`, `ESHOP_ALLOW_DB_RESET`), and the
      manual checklist. Hand off execution to **`run-tests-and-report`**.
