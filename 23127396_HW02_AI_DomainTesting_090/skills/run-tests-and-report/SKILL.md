---
name: run-tests-and-report
description: >-
  Execute the generated test harness against the running EShop backend, collect
  PASS/FAIL/MANUAL/PROBE results, and produce a Markdown results report plus a
  candidate-bug list mapped to spec rules. Use when someone says "run all the
  test cases / execute the tests / run the suite and report results / produce a
  test report". Consumes tests/results.json from the generate-test-script skill.
---

# Run Tests & Report

Run the harness produced by **`generate-test-script`** against the live SUT, then turn the raw
results into a human report: a summary, a per-case results table, and a **candidate-bug** section.

## Guardrails (read first)

1. **A FAIL means the implementation violates the spec — a *candidate bug*, not a test defect.**
   This SUT is deliberately buggy; report failures, do **not** fix the SUT and do **not** relax
   the harness to turn red green.
2. **Verify before publishing a bug.** A FAIL is a *candidate*; confirm the actual response is a
   genuine spec violation (not a fixture/setup problem or an environment issue) before it enters
   `docs/bug-report.md` or GitHub Issues.
3. **MANUAL and PROBE are not passes or fails.** Surface MANUAL cases as a checklist for a human;
   surface PROBE (spec-undefined) actuals for human judgement. Never auto-mark them PASS.
4. **Deterministic runs.** Reset/seed as the harness prescribes; note any case that needed a
   backend restart after a DB reset. Record the exact commit/DB state in the report header.
5. **Read-only to the SUT source.** This skill runs and reports; it changes only files under
   `tests/` and `docs/`.

## Inputs → Outputs

- **Input:** `tests/runner.mjs` + `tests/results.json` (from the generator); a running backend on
  `http://localhost:3000`; the design report for Expected/traceability (`docs/test-design-report.md`).
- **Output:**
  - `docs/test-results.md` — summary + full results table + candidate-bug section.
  - (optional) appended entries in `docs/bug-report.md` and draft `gh issue` commands for
    confirmed failures (see the main workflow §8).

## Method — 5 steps

### Step 1 — Preflight the environment
- Confirm the backend answers: `GET http://localhost:3000/api/products` → 200. If not, start it
  (`cd backend && node server.js`, background) — note that `require('./database')` reseeds on
  boot, so a fresh start ≈ a clean DB.
- Confirm Node ≥ 18 (`fetch` built-in). Export env: `ESHOP_API` if non-default;
  `ESHOP_ALLOW_DB_RESET=1` only if you intend the harness to reset between stateful cases.
- Record in the report header: timestamp, backend commit (`git rev-parse --short HEAD`), whether
  DB reset was enabled.

### Step 2 — Run the harness
`node tests/runner.mjs` → writes `tests/results.json` and prints the tally
(`PASS/FAIL/MANUAL/PROBE/ERROR`). If ordering matters (stateful FR-10/FR-09 usage cases), the
generator should have grouped fixtures per case; if a run is flaky, re-run with DB reset enabled
and note it.

### Step 3 — Aggregate
From `results.json` compute totals overall and per feature, and per status. Separate:
- **FAIL** → candidate bugs (spec violations).
- **ERROR** → harness/fixture/env problems to fix first (not bugs until re-run cleanly).
- **MANUAL** → human checklist. **PROBE** → record actual, human decides.

### Step 4 — Write `docs/test-results.md`
Use the layout below. Every row keeps the spec **Expected** beside the observed **Actual** so a
reviewer can adjudicate. Order FAILs first, most-severe by feature hotspot.

### Step 5 — Route confirmed failures to bug reporting
For each **verified** FAIL, draft a bug entry (spec ref from the report's §4 traceability, steps
= the case's request, Expected vs Actual) and the matching `gh issue create` command per the main
workflow §8. Cross-link case ID ↔ bug ID ↔ issue URL. Leave unverified/ERROR items out.

## Report template — `docs/test-results.md`

```markdown
# EShop — Test Execution Report

- **When:** <ISO timestamp>   **Backend commit:** <short sha>   **DB reset:** on/off
- **Source design:** docs/test-design-report.md (130 cases)   **Harness:** tests/runner.mjs

## Summary
| Status | Count | | Feature | PASS | FAIL | MANUAL | PROBE | ERROR |
|--------|------:|-|---------|-----:|-----:|-------:|------:|------:|
| PASS   |  …    | | FR-05   |  …   |  …   |  …     |  …    |  …    |
| FAIL   |  …    | | FR-09   |  …   |  …   |  …     |  …    |  …    |
| MANUAL |  …    | | FR-14   |  …   |  …   |  …     |  …    |  …    |
| PROBE  |  …    | | FR-10   |  …   |  …   |  …     |  …    |  …    |
| ERROR  |  …    | |         |      |      |        |       |       |

## Candidate bugs (FAIL — spec violations, verify before filing)
| Case | Feature | Spec rule | Expected (spec) | Actual | Suspected defect |
|------|---------|-----------|-----------------|--------|------------------|
| FR09-BVA-02 | FR-09 | C3 `>=` | Applies; discount 30,000; final 270,000 | 400 "chưa đủ giá trị tối thiểu" | `>` used instead of `>=` |

## Full results
| Case | Status | Expected | Actual | Note |
|------|--------|----------|--------|------|
| … | PASS/FAIL/MANUAL/PROBE/ERROR | … | … | … |

## Manual checklist (run in the browser)
- [ ] FR05-DT-10 — search `<script>…` → no alert, term escaped (R5/SEC-04)
- [ ] FR05-DT-01 — one `<h1>`, image `alt` present, price `30.000.000 ₫` (R2/R3/R8)
- …

## Probes (spec-undefined — record & decide)
| Case | Actual | Question for reviewer |
|------|--------|-----------------------|
| FR09-DT-14 | … | Is coupon code case-sensitive per spec? |
```

## Sanity expectations for this SUT (do not hard-code as passes — verify)
Because the implementation has planted defects, expect **FAILs** to cluster at the known hotspots
(they are the point of the exercise): FR-09 `total == min` (`>` vs `>=`) and the percent formula;
FR-09 anonymous-coupon acceptance; FR-14 empty-name accepted and non-admin writes returning 200
instead of 403; FR-05 `search=%` returning the whole catalog and SQL/`<script>` reflected; FR-10
`canceled→delivered` accepted and user-cancel-while-shipping accepted. If one of these **passes**,
double-check the assertion encodes the spec correctly before trusting it.

## Output checklist
- [ ] Preflight recorded (backend up, Node ≥18, commit, reset flag).
- [ ] `tests/results.json` produced; totals reconciled with the design count.
- [ ] `docs/test-results.md` written: summary, candidate-bug table, full table, manual + probe lists.
- [ ] FAILs separated from ERRORs; each candidate bug traces to a spec rule.
- [ ] Verified failures routed to `docs/bug-report.md` + `gh issue` drafts (workflow §8); case ↔ bug ↔ issue cross-linked.
