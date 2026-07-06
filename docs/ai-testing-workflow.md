# AI-Collaboration Testing Workflow — EShop SUT

> **Purpose.** A precise, repeatable workflow for completing the course assignment on the
> four selected features using **Domain Testing** and **Boundary Value Analysis (BVA)**,
> in collaboration with AI tools, and for building reusable **Agent Skills** so the same
> techniques can be re-applied to other features later.
>
> **Selected features**
> - **FR-05** — Product listing & search (Web)
> - **FR-09** — Discount coupons (Checkout)
> - **FR-14** — Category management (CRUD, Admin)
> - **FR-10** — Order state machine (transitions)
>
> **Authoritative spec = `README.md`** (the *intended correct* behavior). The code in
> `backend/server.js` deliberately violates the spec in places — those violations are the
> bugs you must find. Never "fix" them; **document** them.

---

## 0. Deliverables map (what you must hand in)

| # | Deliverable | Location | Task it satisfies |
|---|-------------|----------|-------------------|
| D1 | Domain-testing test cases + written method, per feature | `docs/test-design/FR-05-domain.md`, `FR-09-…`, `FR-14-…`, `FR-10-domain.md` | Domain Testing |
| D2 | BVA test cases + written method, per feature | `docs/test-design/FR-05-bva.md`, `FR-09-…`, `FR-14-…`, `FR-10-bva.md` | Boundary Value Analysis |
| D3 | AI gap-analysis report | `docs/ai-gap-analysis.md` | AI gap analysis |
| D4 | Bug report (Markdown) | `docs/bug-report.md` | Bug reporting |
| D5 | GitHub Issues (one per bug) with screenshots | GitHub → Issues | Bug reporting |
| D6 | Reusable Agent Skills | `.claude/skills/domain-testing/` and `.claude/skills/boundary-value-analysis/` | Agent Skill |
| D7 | Evidence (screenshots, cURL/Postman logs) | `docs/evidence/` | supports D4/D5 |

> Create the folders as you go: `docs/test-design/`, `docs/evidence/`.

---

## 1. The AI-collaboration model (who does what)

Treat the AI as a **test-design partner and reviewer**, not an oracle. Keep the human in
control of the truth (the spec) and of execution against the real system.

| Step | Human (you) | AI |
|------|-------------|-----|
| Understand spec | Read `README.md` FR sections; decide scope | Summarize/paraphrase the FR into testable rules on request |
| Identify variables & partitions | Approve / correct | Propose the variable list, equivalence classes, boundaries |
| Draft test cases | Approve / prune / add missed ones | Generate the first-draft test tables |
| Execute | **You run** each case against the real SUT | (cannot execute the SUT for you) |
| Compare to spec | **You** decide pass/fail vs `README.md` | Explain *why* an observed result violates a rule |
| Gap analysis | Compare AI output to your own findings | Self-critique when prompted |

**Golden rules**
1. **Spec is the oracle, not the code and not the AI.** If AI reasons from the code, it will
   call a planted bug "correct." Always anchor prompts to `README.md`.
2. **AI never decides pass/fail** — it proposes cases and explanations; you verify against the SUT.
3. **Log every prompt** you use into the relevant deliverable so the method is reproducible
   (the assignment asks for a *step-by-step explanation of how you applied the technique*).

---

## 2. Environment setup (once)

```bash
# Terminal 1 — backend
cd backend
npm install
node database.js      # DESTRUCTIVE: drops + reseeds SQLite. Re-run to reset state between tests.
node server.js        # API on http://localhost:3000

# Terminal 2 — web (FR-05)
cd frontend-web && npm install && npm run dev          # http://localhost:5173

# Terminal 3 — admin (FR-14 category CRUD, FR-10 order-status transitions)
cd frontend-admin && npm install && npm run dev        # http://localhost:5174

# FR-10 (order state machine) and FR-09 (coupons) are driven mostly at the API layer —
# use Postman / cURL against http://localhost:3000 with admin + user JWTs. No extra server needed.
```

**Seeded data you will reference** (from `backend/database.js`):
- Accounts: `admin@eshop.com / Admin123!`, `test@eshop.com / Test1234!`
- Categories: `Điện thoại (1)`, `Laptop (2)`, `Phụ kiện (3)`
- Products (5): prices 30,000,000 / 28,000,000 / 45,000,000 / 6,000,000 / 4,000,000 ₫
- Coupons: `SAVE10` (percent 10, min 300k), `BIGBUY` (fixed 50k, min 500k), `VIP100` (fixed 100k, min 300k, 2 uses), `EXPIRED` (percent 20, min 100k, expired 2020-01-01)

> **Reset discipline:** any test that writes data (add/delete category, use a coupon) must be
> preceded by a clean state. Re-run `node database.js` when needed and note it in the case.

Tools for execution: **Postman** or **cURL** for API-level cases (FR-09 coupons, FR-10
transitions, FR-14 CRUD); the **browser + DevTools** for UI cases (FR-05 search, FR-14 admin).

---

## 3. Lecture review checklist (do this before designing)

Re-read the course slides and confirm you can state each idea in one sentence. The workflow
below assumes these definitions.

**Domain Testing / Equivalence Class Partitioning**
- [ ] A **domain** = the set of values a variable can take; partition it into **equivalence
      classes** where all members are expected to be treated the same.
- [ ] Classes are **valid** (should be accepted) and **invalid** (should be rejected).
- [ ] Pick **one representative** per class (plus extra reps for high-risk classes).
- [ ] Distinguish **primary dimensions** (a single ordered variable) from **secondary
      dimensions** (categorical, format, and multi-variable interactions).
- [ ] Consider **variable interactions** (e.g., coupon type × order total × login state).
- [ ] The classical "one-cause-at-a-time" vs. combining independent variables.

**Boundary Value Analysis**
- [ ] Bugs cluster at the **edges** of equivalence classes (`>` vs `>=`, off-by-one).
- [ ] For an ordered variable with boundary *b*, test **b−1, b, b+1** (3-value) — and when the
      class also has an upper edge, the classic **min−1, min, min+1, max−1, max, max+1** set.
- [ ] Include a **typical/nominal** value (robust vs. worst-case BVA if the lecture covers it).
- [ ] Boundaries also apply to **strings** (length 0, 1, max, max+1), **counts**, and **dates**.

Write a 4–6 line summary of these in the top of each `*-domain.md` / `*-bva.md` file so the
grader sees you internalized the technique.

---

## 4. Per-feature analysis → the 6-step method

Apply the **same 6 steps** to every feature. Steps 2–3 are Domain Testing; step 4 is BVA.

1. **Extract testable rules** from `README.md` (list every "must / phải / >= / duy nhất …").
2. **Identify variables** (inputs and relevant state) and their domains.
3. **Partition** each variable into valid/invalid equivalence classes → pick representatives → **Domain test cases**.
4. **Find boundaries** of every ordered/length/date class → build **BVA test cases**.
5. **Execute** against the SUT; record Actual vs Expected(spec); mark PASS/FAIL.
6. **Triage** FAILs into bugs (D4/D5) and feed misses into gap analysis (D3).

The AI prompt scaffold used at steps 1–4 (reuse verbatim, swap the FR block):

```
You are helping design software tests. The ONLY source of correct behavior is this
specification excerpt (not any implementation):
"""
<paste the exact FR-xx text from README.md>
"""
Task: <one of>
 (a) List every testable rule as an atomic checkable statement.
 (b) List the input variables and state variables, with each one's domain/type.
 (c) For each variable, give valid and invalid equivalence classes with one
     representative value each; note interactions between variables.
 (d) For each ordered/length/date variable, give boundary values using
     {min-1,min,min+1,max-1,max,max+1} plus a nominal value; explain each.
Output a Markdown table: [ID | Variable | Class/Boundary | Value | Expected per spec | Rationale].
Do NOT infer behavior from code. If the spec is silent, say "spec-undefined".
```

---

## 5. Feature playbooks

Each playbook lists the **variables**, the **partitions/boundaries** to cover, and the
**hotspots** (where the implementation is known to be risky — use these to sanity-check that
your test set would *catch* a defect, without pre-writing the verdict). Verdicts come only
from executing against the SUT.

### 5.1 FR-05 — Product listing & search  *(Web + `GET /api/products`)*

**Spec rules:** grid of all products; each shows image (with alt), name, price in `₫` with
thousands separators; search by name; **search term must be rendered safely (no HTML)**;
loading state; empty state; exactly **one `<h1>`** per page.

**Variables**
| Var | Domain |
|-----|--------|
| `search` keyword | free text (string) — length, character set, matching vs non-matching |
| product set | 5 seeded rows (state) |
| network | fast / slow (for loading state) |

**Domain classes for `search`**
- Valid–match (e.g., `iPhone`), Valid–partial (`Mac`), Valid–case (`iphone`),
  Valid–Vietnamese diacritics (`Điện`), Valid–whitespace-only, No-match (`zzz`),
  Empty (returns all), **Special/HTML** (`<b>x</b>`, `<script>alert(1)</script>`),
  **SQL metacharacters** (`' OR '1'='1`, `%`, `_`, `'`), very long string.

**BVA for `search`** length: 0, 1, 2, 255, 256, ~10 000 chars; the SQL `LIKE` wildcards `%`
and `_` as literal-vs-wildcard boundary; matching at start/middle/end of a name.

**Hotspots to make sure your cases exercise**
- Search uses string concatenation into SQL (`WHERE name LIKE '%<term>%'`) → cases with `'`,
  `%`, `_`, `OR 1=1`, and `<script>` should be in your Domain set (SEC-05 / SEC-04, FR-05 "safe render").
- `GET /api/products/:id` for a **non-existent id** and for **even vs odd id** (price type may
  differ) → add id boundary cases: `0, 1, <max seeded>, <max+1>, non-numeric`.
- Confirm exactly one `<h1>` on the page; check `alt` text present & non-empty; check `₫`
  thousands formatting.

### 5.2 FR-09 — Discount coupons  *(`POST /api/apply-coupon`)*

**Spec rules (all 5 conditions must hold):** C1 exists & `is_active=1`; C2 not expired
(now < `expired_at`); **C3 total `>=` `min_order_amount`**; C4 user logged in (valid JWT);
C5 uses-so-far `<` `max_uses_per_user`. Formulas: percent → `total × value / 100`;
fixed → `value`; `final = total − discount`.

**Variables:** `code`, `total_amount`, `user_id`/login state, `type`, `discount_value`,
`min_order_amount`, `expired_at`, prior-usage count.

**Domain classes**
- `code`: exists+active / exists+inactive / not-exist / empty / wrong-case / SQL-meta.
- `type`: `percent` / `fixed` / other.
- login: authenticated / anonymous (no `user_id`).
- usage: `0`, `< max`, `= max`, `> max`.
- expiry: future (`SAVE10`) / past (`EXPIRED`).

**BVA — the critical one is C3 threshold.** For each coupon use `min_order_amount` as boundary
*b*:
| Coupon | b (min) | Test at b−1 | at b | at b+1 |
|--------|---------|-------------|------|--------|
| SAVE10 | 300,000 | 299,999 | **300,000** | 300,001 |
| BIGBUY | 500,000 | 499,999 | **500,000** | 500,001 |
| VIP100 | 300,000 | 299,999 | **300,000** | 300,001 |

Spec: at `total = min` the coupon **must apply** (`>=`). This is the single most important
boundary case in the whole assignment — design it explicitly.

Other BVA: `max_uses_per_user` boundary (uses = max−1 pass, = max still allowed?, = max+1 reject);
expiry date boundary (the day of `expired_at`); `total_amount` = 0 and negative.

**Hotspots:** the min-order comparison, the percent formula, whether an **anonymous** request
(no token / no `user_id`) is accepted, and whether expiry is enforced for orders *below* the
min threshold. Make sure your test set contains a case for each so a defect can't hide.

### 5.3 FR-14 — Category management (CRUD)  *(`/api/categories`, Admin)*

**Spec rules:** Admin can Add / View / Delete; **name is required, must not be empty**;
per FR-12/SEC-03 the write endpoints must require a **valid JWT AND `role='admin'`**.

**Variables:** `name` (string), auth token (none / valid user / valid admin), category `id`
(for delete).

**Domain classes for `name`:** normal / duplicate / empty `""` / whitespace-only / very long /
HTML/SQL-meta / Vietnamese diacritics / numeric-only.

**Domain classes for auth (authorization matrix — key for FR-12):**
| Actor | POST/DELETE category | Expected |
|-------|----------------------|----------|
| No token | create | 401 reject |
| Valid **user** (non-admin) token | create | **reject (403)** per SEC-03 |
| Valid **admin** token | create | accept |

**BVA for `name` length:** 0 (empty), 1, 255, 256, large. Also delete boundaries: delete
existing id, non-existent id, id `0`/negative/non-numeric, and delete a category that **has
products** (referential integrity).

**Hotspots:** empty-name acceptance and the missing admin-role check. Your matrix above must
include the non-admin-token row to reveal the SEC-03 violation.

### 5.4 FR-10 — Order state machine  *(`PUT /api/admin/orders/:id/status`, `PUT /api/orders/:id/cancel`)*

**Spec rules:** 5 states `pending → confirmed → shipping → delivered`, plus `canceled` from
`pending`/`confirmed`. `delivered` and `canceled` are **final** (no exit). **When `shipping`, the
user may NOT self-cancel — admin only.** Every illegal transition must return an error.

**Variables:** current state, requested target state, **actor** (user self-cancel via `/cancel`
vs admin via `/admin/.../status`), and the target `status` value (valid enum vs unknown string).

**Domain method — state-transition matrix.** Treat the input as the triple *(current, target,
actor)*; build the full 5×5 matrix, where **legal transitions are the valid classes** and
**illegal ones the invalid classes**. Per the coverage rules, walk all legal forward transitions
in one happy path (pending→confirmed→shipping→delivered) and **isolate each illegal transition**
in its own test.

**BVA — the state machine's ordinal edges** (FR-10 has no numeric range):
- **Terminal-state edge:** transitions *out of* `delivered`/`canceled` must be rejected — the
  `canceled → delivered` case is the signature defect (a final state that still transitions).
- **User-cancel permission edge** along `pending → confirmed → shipping`: `confirmed` is the last
  user-cancelable state, `shipping` the first forbidden — an off-by-one lets a user cancel while
  shipping. `confirmed`(allowed) + `shipping`(forbidden) pin the edge.
- **Forward-adjacency edge:** only the `n → n+1` step is legal; skip-ahead (+2/+3) and backward
  (−1) must reject.

**Hotspots:** `canceled → delivered` acceptance and user-cancel-while-shipping. Your matrix and
the two edge cases above must include both so the defects can't hide.

**Fixture recipe (via API):** create an order (`POST /api/checkout` → `pending`), drive it with
admin `PUT /api/admin/orders/:id/status` to reach the source state you need; obtain a `canceled`
order by cancelling a `pending` one. Use the **owner** user token for `/cancel` cases and the
admin token for status changes.

---

## 6. Executing & recording (steps 5–6 of §4)

For every test case fill this table (this is the D1/D2 format). Keep one file per
feature-technique.

```markdown
| ID | Precondition | Input / Steps | Expected (per README FR-xx) | Actual | Status | Evidence |
|----|--------------|---------------|------------------------------|--------|--------|----------|
| F09-BVA-03 | reset DB; login test user | apply SAVE10, total_amount=300000 | Coupon applies; discount=30,000; final=270,000 | ... | PASS/FAIL | evidence/f09-bva-03.png |
```

Rules:
- **Expected** always cites the spec rule ID; never "what the app did."
- Capture **evidence** for every FAIL (screenshot for UI; saved response for API) into `docs/evidence/`.
- Reset DB between stateful cases and note it in *Precondition*.

---

## 7. AI gap analysis (D3)

After you finish executing, produce `docs/ai-gap-analysis.md`. Method:

1. **Two-column diff.** Column A = cases/bugs the AI proposed. Column B = cases/bugs you found
   by hand or by exploratory testing. Highlight anything in B not in A (AI *misses*) and
   anything in A that was wrong/redundant (AI *noise*).
2. **Ask the AI to self-critique** *after* you show it the SUT behavior:
   ```
   Here is the spec (README FR-xx), the test cases you generated, and the ACTUAL
   observed results from the running system: <paste>. Which real defects did your
   original test set fail to reveal, and why? Categorize each miss as:
   (1) prompt/input limitation, (2) tool limitation (couldn't run the SUT / no code
   visibility / anchored to code not spec), or (3) inherent feature complexity
   (multi-variable interaction, hidden state).
   ```
3. **Classify each miss** into the three required buckets and write *why*:
   - **Prompt/input quality** — e.g., you didn't give the seed data, so AI couldn't compute the
     `total = min_order` boundary; or you pasted code so AI validated the bug as correct.
   - **AI tool limitation** — cannot execute the SUT, cannot see rendered HTML/`<h1>` count,
     cannot observe in-memory cart/session, may hallucinate an endpoint.
   - **Inherent complexity** — interaction bugs (coupon type × login × threshold), the
     FR-10 state-machine edges (final-state exit, actor-permission off-by-one), security cases
     needing an attacker mindset.
4. For **each miss**, add the recovered test case back into D1/D2 so the final suite is complete.

Likely miss patterns to look for (verify, don't assume): boundary `>` vs `>=` off-by-one;
anonymous-coupon auth gap; empty-name acceptance; missing admin-role check (SEC-03); SQL/XSS
payloads in search/name; the `canceled→delivered` final-state leak and user-cancel-while-shipping
(FR-10); even/odd product-id price-type inconsistency; single-`<h1>` and `alt`-text UI rules.

---

## 8. Bug reporting (D4 + D5)

### 8.1 Markdown report — `docs/bug-report.md`
One entry per confirmed bug, ordered by severity:

```markdown
## BUG-01 — [FR-09] Coupon rejected when order total exactly equals minimum
- **Severity:** High
- **Spec:** README FR-09, condition C3 — "Tổng đơn hàng **>=** min_order_amount".
- **Environment:** backend@localhost:3000, seed DB, coupon SAVE10 (min 300,000).
- **Preconditions:** DB reset; logged in as test user.
- **Steps:** POST /api/apply-coupon { code:"SAVE10", total_amount:300000, user_id:2 }
- **Expected:** Coupon applies (discount 30,000; final 270,000).
- **Actual:** 400 "Đơn hàng chưa đủ giá trị tối thiểu…".
- **Evidence:** ![](evidence/bug-01.png)
- **Traceability:** case F09-BVA-03.
```

### 8.2 GitHub Issues — one issue per bug (with screenshot)
The repo is a git repo; use the `gh` CLI (already available) or the web UI.

```bash
# Confirm the remote / repo
gh repo view

# Create an issue from the same body (attach the screenshot by dragging it into the
# web issue, OR reference an image committed under docs/evidence/).
gh issue create \
  --title "[FR-09] Coupon rejected when total == min_order_amount (should apply, >=)" \
  --label bug --label FR-09 \
  --body-file docs/issues/bug-01.md
```

Requirements for each issue:
- Title format `[FR-xx] short summary`.
- Body = the same fields as the Markdown entry (spec ref, steps, expected, actual).
- **Attach a screenshot** — drag-drop into the issue on github.com (this uploads it to
  GitHub's CDN), or commit the PNG under `docs/evidence/` and reference it with a relative
  link/`![](url)`. Screenshots are **mandatory** per the assignment.
- Add labels: `bug` + the `FR-xx` label + severity.
- Cross-link: put the Issue URL back into `docs/bug-report.md` and the test-case row.

> If `gh` is not authenticated, run `gh auth login` yourself in the terminal (type
> `! gh auth login` in this session to do it interactively), then re-run the create command.

---

## 9. Build the reusable Agent Skills (D6)

Package the two techniques as Claude Code **Agent Skills** so future features can be tested by
just invoking the skill. Each skill is a folder under `.claude/skills/<name>/` containing a
`SKILL.md` with YAML frontmatter (`name`, `description`) plus the method and templates.

```
.claude/skills/
├── domain-testing/
│   └── SKILL.md
└── boundary-value-analysis/
    └── SKILL.md
```

**`domain-testing/SKILL.md` — required contents**
- `description:` must say *when* to trigger: "Use when designing test cases for a feature by
  equivalence-class partitioning / domain analysis against a written spec."
- The **method**: extract rules → list variables & domains → partition into valid/invalid
  classes → pick representatives (extra for risky classes) → cover interactions → output the
  standard case table.
- **Guardrails**: spec is the oracle (never the code), mark spec-undefined, AI never rules
  pass/fail.
- The **prompt scaffold** and the **case-table template** from §4/§6.

**`boundary-value-analysis/SKILL.md` — required contents**
- `description:` "Use when a feature has ordered numeric / length / date inputs and you need
  edge-case tests (off-by-one, min/max)."
- The **method**: for each ordered variable find boundary *b* → generate `{b−1, b, b+1}` (and
  `{min−1…max+1}` when both edges exist) + a nominal value → tabulate with expected-per-spec.
- Worked reference example: the FR-09 `min_order_amount` `>=` boundary.
- The same guardrails + templates.

**Validate the skills** by running them on a *fifth, unselected* feature (e.g., FR-01
registration or FR-15 product CRUD) and confirming they produce a usable case table without
extra hand-holding. Record that trial in the skill's README or in D3.

> After writing each `SKILL.md`, the skill becomes invocable in a new session. Keep them
> spec-driven and project-agnostic so they transfer beyond EShop.

---

## 10. Definition of Done (final checklist)

- [ ] `docs/test-design/FR-05,09,14,13-domain.md` — each with method summary + case table + results
- [ ] `docs/test-design/FR-05,09,14,13-bva.md` — same
- [ ] Every FAIL has evidence in `docs/evidence/`
- [ ] `docs/ai-gap-analysis.md` — misses classified into the 3 buckets, recovered cases folded back in
- [ ] `docs/bug-report.md` — all confirmed bugs, severity-ordered, spec-traceable
- [ ] GitHub Issues — one per bug, `[FR-xx]` title, labels, **screenshot attached**, linked back
- [ ] `.claude/skills/domain-testing/SKILL.md` and `.claude/skills/boundary-value-analysis/SKILL.md`, trialed on a 5th feature
- [ ] Every test case cites a `README.md` rule as its expected result (never the code)

---

## Appendix A — Ready-to-paste AI prompts

**A1. Extract rules (per feature)** — see §4 scaffold, task (a).
**A2. Variables & domains** — §4 scaffold, task (b).
**A3. Equivalence classes** — §4 scaffold, task (c).
**A4. Boundary values** — §4 scaffold, task (d).
**A5. Adversarial pass (security-flavored cases):**
```
Given README FR-xx and that this is a deliberately-buggy teaching system, list test
inputs an attacker/edge-case tester would try that a naive positive-path suite omits:
injection strings, HTML/script payloads, auth/authorization bypass (missing token,
non-admin token), boundary off-by-one, empty/whitespace, and cross-feature state
interactions. For each, give the exact input, the endpoint, and the spec rule it probes.
```
**A6. Gap self-critique** — §7 step 2.

## Appendix B — Case & bug templates
See the fenced tables in §6 (case table) and §8.1 (bug entry). Copy them into each deliverable.
