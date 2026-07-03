# FR-14 — Category Management (CRUD) — Boundary Value Analysis (BVA)

> **Technique:** BVA = **Step 4 of Domain Testing** (course lecture **CSC13003 — S04**). Best
> representatives of ordered/length fields are edge values. **Rationale:** boundary tests catch
> the two edge defects a nominal value misses — **inequality mis-specified** and **boundary value
> mistyped**. **Model:** `LB−1/LB/LB+1`, `UB−1/UB/UB+1`, extremes, nominal. **Oracle =
> `README.md` FR-14**; **no PASS/FAIL**. Complements `FR-14-domain.md` — **edges only**.
>
> **Endpoints:** `POST /api/categories {name}`, `DELETE /api/categories/:id`.
> **Seed:** categories ids `1,2,3`.

---

## Step 1–2 — Boundaries & operators

| # | Variable | Boundary b | Operator / inclusivity (spec) |
|---|----------|------------|-------------------------------|
| B1 | `name` **length** | LB = 0 (required non-empty) | FR-14 "name required, not empty" → **length ≥ 1 valid; length 0 invalid**. LB = 1 is the smallest valid. |
| B2 | `name` **length** upper | no max stated | FR-14 sets no max → upper edge (255/256/large) is **`spec-undefined`** (probe robustness). |
| B3 | category `id` (DELETE) | valid range = existing ids **1..3** | id must reference an existing row → `1..maxId` valid; `id < 1`, `id > maxId`, non-numeric invalid. |

> B1 (the empty→non-empty length edge) is the FR-14 high-value boundary — it decides whether the
> "name is required" rule is actually enforced.

---

## Step 3–4 — Boundary cases

### B1/B2 — `name` length (LB = 0 required; no spec'd UB)

| ID | Variable | Boundary b (operator, rule) | Value tested (len) | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------------|--------------|---------------------|--------|
| BVA-01 | name length | 0 (required, FR-14) | `""` (0) | admin token | **Reject** — name required, not empty | LB−1 / at-0 (invalid) |
| BVA-02 | name length | 0→1 (smallest valid) | `"A"` (1) | admin token | **Accept** — 1 char is non-empty (FR-14) | LB (smallest valid) |
| BVA-03 | name length | 1→2 | `"AB"` (2) | admin token | Accept | LB+1 |
| BVA-04 | name length (whitespace) | 0-effective | `" "` (1 space, trims to 0) | admin token | Reject — whitespace-only = empty (FR-14) | LB edge via trim |
| BVA-05 | name length | 255 | 255-char name | admin token | Accept or `spec-undefined` (no max) — probe | typical upper |
| BVA-06 | name length | 256 | 256-char name | admin token | `spec-undefined` — probe truncation/rejection | UB+1 |
| BVA-07 | name length | largest allowed | 10,000-char name | admin token | Graceful handling, no crash (`spec-undefined` on cap) | extreme max |

### B3 — category `id` on DELETE (valid = existing 1..3)

| ID | Variable | Boundary b (operator, rule) | Value tested | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------|--------------|---------------------|--------|
| BVA-08 | id | LB = 1 (min existing) | id=1 | admin; id 1 exists | Deletes category 1 (FR-14) | LB (min valid) |
| BVA-09 | id | LB−1 = 0 | id=0 | admin | Reject/no-op — no such id | LB−1 |
| BVA-10 | id | negative | id=-1 | admin | Reject/no-op — invalid id | below range |
| BVA-11 | id | UB = 3 (max existing) | id=3 | admin; id 3 exists | Deletes category 3 (FR-14) | UB (max valid) |
| BVA-12 | id | UB+1 = 4 (just past max) | id=4 | admin; only 1–3 exist | Reject/no-op — not found | UB+1 |
| BVA-13 | id | far above range | id=9999 | admin | Reject/no-op — not found | extreme |
| BVA-14 | id | non-numeric | id=`abc` | admin | Reject — invalid id (`spec-undefined` on exact code) | type boundary |

---

## Coverage check (skill checklist)

- [x] Method summary + boundary rationale.
- [x] B1 length straddle (0/1/2 + whitespace-trim edge); B2 upper (255/256/10000); B3 id LB−1/LB/UB/UB+1 + extremes + non-numeric.
- [x] Operator/inclusivity stated: name length **≥1 valid, 0 invalid**; id **1..maxId valid**.
- [x] String-length + 0/negative/non-numeric id boundaries covered; no-max ⇒ `spec-undefined`.
- [x] Every Expected cites FR-14; unknowns `spec-undefined` (BVA-05/06/07/14).
- [x] No duplication with `FR-14-domain.md` (class reps there; edges here).

## Highest-value boundary in FR-14
**BVA-01/02/04 — the empty→non-empty `name` length edge.** FR-14 requires a non-empty name, so
length 0 (and whitespace-that-trims-to-0) must be **rejected** while length 1 is **accepted**. An
implementation that skips this validation accepts the empty name — detectable precisely at this
boundary. All BVA cases run under an **admin** token so a length result isn't masked by an
authorization rejection (auth classes live in `FR-14-domain.md`).

## Execution notes
Log in as admin up front. `node database.js` to reset ids to `1,2,3` before the DELETE cases
(BVA-08…14), since deletes are destructive and re-running shifts which ids exist. For BVA-14 send
a non-numeric path segment (`/api/categories/abc`). Capture each JSON/status; record
Actual/Status/Evidence in the shared results table (workflow §6).
