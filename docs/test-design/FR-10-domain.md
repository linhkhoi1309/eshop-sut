# FR-10 — Order State Machine — Domain Testing (Equivalence Class Partitioning)

> **Technique:** Domain Testing per course lecture **CSC13003 — S04**, applied as
> **state-transition testing**. The "input" is the triple **(current state, requested target,
> actor)**; two triples share an equivalence class iff the spec expects the **same result**
> (allowed vs rejected). **Valid classes = legal transitions; invalid classes = illegal
> transitions.** **Coverage (Step 3):** legal transitions **combined** into a walk through the
> machine; each illegal transition **isolated** in its own test. **Oracle = `README.md` FR-10
> only**; `spec-undefined`/`spec-ambiguous` where silent; **no PASS/FAIL** (execution decides).
>
> **Endpoints:** admin — `PUT /api/admin/orders/:id/status {status}`; user self-cancel —
> `PUT /api/orders/:id/cancel`.

**Spec (README 141–162).** 5 states: `pending, confirmed, shipping, delivered, canceled`.
Legal transitions:

| From | To | Trigger |
|------|----|---------|
| pending | confirmed | admin confirms |
| confirmed | shipping | admin ships |
| shipping | delivered | admin completes |
| pending | canceled | user **or** admin cancels |
| confirmed | canceled | user **or** admin cancels |

Constraints: **`delivered` and `canceled` are FINAL** — no transition out. **When `shipping`,
the User may NOT self-cancel — only Admin may act.** Every illegal transition must return an error.

---

## Step 1 — Input & Output variables

| Kind | Variable | Domain |
|------|----------|--------|
| **Input** | current state | {pending, confirmed, shipping, delivered, canceled} |
| **Input** | requested target state | {pending, confirmed, shipping, delivered, canceled} |
| **Input** | actor | {user (self, `/cancel`), admin (`/admin/.../status`)} |
| **Input** | target `status` value | valid enum member / unknown string (e.g. `foo`) |
| **Output** | success — transition applied | order status updated |
| **Output** | error — illegal transition | "Invalid state transition …" |
| **Output** | error — user forbidden (shipping+) | rejection: user may not cancel a shipping/final order |

---

## Step 2 — Complete transition matrix (the partition set)

Legend: **✔** legal · **�’** illegal (must reject) · **F** source is a final state (all exits illegal).
Rows = current state; columns = target.

| From \ To | pending | confirmed | shipping | delivered | canceled |
|-----------|---------|-----------|----------|-----------|----------|
| **pending** | �’ self | **✔ (admin)** | �’ | �’ | **✔ (user/admin)** |
| **confirmed** | �’ | �’ self | **✔ (admin)** | �’ | **✔ (user/admin)** |
| **shipping** | �’ | �’ | �’ self | **✔ (admin)** | admin-only ✔ / **user �’** (see note) |
| **delivered** | �’ F | �’ F | �’ F | �’ F | �’ F |
| **canceled** | �’ F | �’ F | �’ F | �’ F | �’ F |

**Equivalence classes derived from the matrix:**

| EC | Class | Members | Representative |
|----|-------|---------|----------------|
| EC1 | valid: pending→confirmed (admin) | 1 | order in `pending` |
| EC2 | valid: confirmed→shipping (admin) | 1 | order in `confirmed` |
| EC3 | valid: shipping→delivered (admin) | 1 | order in `shipping` |
| EC4 | valid: pending→canceled (user) | 1 | user cancels own `pending` |
| EC5 | valid: confirmed→canceled (user) | 1 | user cancels own `confirmed` |
| EC6 | valid: pending/confirmed→canceled (admin) | 2 | admin cancels |
| EC7 | **invalid: transition OUT of `delivered`** (final) | 4 targets | delivered→shipping |
| EC8 | **invalid: transition OUT of `canceled`** (final) | 4 targets | canceled→delivered |
| EC9 | **invalid: skip-ahead** (e.g. pending→shipping, pending→delivered, confirmed→delivered) | several | pending→delivered |
| EC10 | **invalid: backward** (e.g. confirmed→pending, shipping→confirmed) | several | shipping→pending |
| EC11 | **invalid: user self-cancel while `shipping`** (admin-only) | 1 | user `/cancel` a shipping order |
| EC12 | invalid: unknown target status | — | status=`foo` |
| EC13 | **spec-ambiguous: admin cancel from `shipping`** | 1 | text allows admin-act, diagram omits → probe |
| EC-O1 | output: success | — | status updated |
| EC-O2 | output: illegal-transition error | — | error message |
| EC-O3 | output: user-forbidden error | — | rejection |

> **Note on EC13:** the diagram branches to `canceled` only from `pending`/`confirmed`, but the
> text says "when shipping, only Admin may act" — implying admin *can* cancel a shipping order.
> This is an intentional spec ambiguity → mark `spec-ambiguous`, report as a spec issue, don't
> pre-judge the verdict.

---

## Step 3 — Selected test cases

### Valid classes — combined into a happy-path walk

| ID | Classes (EC) | Steps | Precondition | Expected (per spec) | Rationale |
|----|--------------|-------|--------------|---------------------|-----------|
| DT-01 | EC1,EC2,EC3,EC-O1 | admin drives one order: pending→confirmed→shipping→delivered | order `pending`; admin token | Each step succeeds; ends `delivered` (FR-10 legal path) | one walk covers all 3 admin forward transitions |
| DT-02 | EC4,EC-O1 | user `/cancel` own `pending` order | order `pending`; owner token | Succeeds → `canceled` (FR-10 user-cancel) | valid user-cancel (pending) |
| DT-03 | EC5,EC-O1 | user `/cancel` own `confirmed` order | order `confirmed`; owner token | Succeeds → `canceled` (FR-10) | valid user-cancel (confirmed) |
| DT-04 | EC6,EC-O1 | admin sets `pending`→`canceled` | order `pending`; admin token | Succeeds → `canceled` (FR-10) | valid admin cancel |

### Invalid classes — one illegal transition isolated per test

| ID | Class (EC) | Steps | Precondition | Expected (per spec) | Rationale |
|----|-----------|-------|--------------|---------------------|-----------|
| DT-05 | EC7 (only) | admin sets `delivered`→`shipping` | order `delivered`; admin | **Reject** — `delivered` is FINAL (FR-10) | final-state exit isolated |
| DT-06 | EC7 (only) | admin sets `delivered`→`canceled` | order `delivered`; admin | Reject — final state (FR-10) | 2nd delivered-exit rep |
| DT-07 | EC8 (only) | admin sets `canceled`→`delivered` | order `canceled`; admin | **Reject** — `canceled` is FINAL (FR-10) | **key planted-defect probe** |
| DT-08 | EC8 (only) | admin sets `canceled`→`confirmed` | order `canceled`; admin | Reject — final state (FR-10) | 2nd canceled-exit rep |
| DT-09 | EC9 (only) | admin sets `pending`→`delivered` | order `pending`; admin | Reject — skip-ahead not legal (FR-10) | skip-ahead isolated |
| DT-10 | EC9 (only) | admin sets `pending`→`shipping` | order `pending`; admin | Reject — skip-ahead (FR-10) | 2nd skip rep |
| DT-11 | EC10 (only) | admin sets `shipping`→`confirmed` | order `shipping`; admin | Reject — backward not legal (FR-10) | backward isolated |
| DT-12 | EC11 (only) | **user** `/cancel` a `shipping` order | order `shipping`; owner token | **Reject** — user may not self-cancel when shipping; admin only (FR-10) | **key planted-defect probe** |
| DT-13 | EC12 (only) | admin sets status=`foo` | order `pending`; admin | Reject — unknown status (FR-10 "invalid transition") | unknown-enum isolated |

### Interaction / ambiguity cases

| ID | Class (EC) | Steps | Precondition | Expected (per spec) | Rationale |
|----|-----------|-------|--------------|---------------------|-----------|
| DT-14 | EC13 | admin sets `shipping`→`canceled` | order `shipping`; admin | `spec-ambiguous` — text permits admin action; diagram omits. Probe & report. | resolves diagram/text conflict |
| DT-15 | EC11 × ownership | user `/cancel` **another user's** `pending` order | order owned by someone else | Reject — user acts only on own orders (FR-11 scoping) | actor × ownership interaction |

---

## Coverage check (skill checklist)

- [x] 4-step approach named; state-transition framing + full N×N matrix.
- [x] **Output** classes partitioned (success / illegal-transition / user-forbidden).
- [x] Complete partition set (EC1…EC13) precedes selected cases.
- [x] Legal transitions **combined** (DT-01 walk); each illegal class **isolated** (DT-05…13).
- [x] **Actor dimension** (user vs admin) covered — EC4/5 vs EC6, and EC11 user-forbidden.
- [x] Final-state exits (EC7/EC8) and the shipping user-cancel rule (EC11) explicitly tested.
- [x] Ambiguity marked `spec-ambiguous` (EC13/DT-14); interaction DT-15.
- [x] No numeric range here; the **edge cases** (final-state exits, actor-permission edge) go to `FR-10-bva.md`.

## Execution notes (design-only file)
Fixtures need orders in each state. Create an order (`POST /api/checkout`, starts `pending`), then
drive it with admin `PUT /api/admin/orders/:id/status` to reach `confirmed`/`shipping`/`delivered`;
to obtain a `canceled` order, cancel a `pending` one. `node database.js` resets. Get both tokens
(admin + owner user). **DT-07 (canceled→delivered) and DT-12 (user cancels shipping) are the two
highest-risk classes** — the SUT is known to under-enforce final-state and actor rules. Capture
each status/JSON; record Actual/Status/Evidence in the shared results table (workflow §6).
