# FR-05 — Product Listing & Search — Boundary Value Analysis (BVA)

> **Technique:** BVA = **Step 4 of Domain Testing** (course lecture **CSC13003 — S04**). *A
> program is more likely to fail at a boundary.* For each ordered equivalence-class partition the
> **best representatives are the boundary values**, so we test values straddling every edge.
> **Boundary rationale (lecture):** boundary tests catch the two edge defects a nominal value
> usually misses — an **inequality mis-specified** (`>` where `>=` intended) and a **boundary
> value mistyped** (transposition).
>
> **Model:** up to ~9 values per partition — `LB−1/LB/LB+1`, `UB−1/UB/UB+1`, the
> **smallest/largest** values the UI allows, and one **nominal**. **Oracle = `README.md` FR-05**;
> **no PASS/FAIL** here. Complements `FR-05-domain.md` — **edges only**, no mid-range reps.
>
> **Endpoint:** `GET /api/products?search=<keyword>`. **Seed:** 5 products (ids 1–5).

---

## Step 1–2 — Boundaries & operators

FR-05 has no numeric-money range (unlike FR-09), but three genuine ordered/length dimensions:

| # | Variable | Boundary(ies) | Operator / inclusivity (spec basis) |
|---|----------|---------------|--------------------------------------|
| B1 | `search` keyword **length** | LB = 0; robustness UB = 255 / 256 / large | R4 sets no max ⇒ upper edge `spec-undefined` (probe). Length 0 = "show all" (R1). |
| B2 | **result-set size** | LB = 0; UB = 5 (all) | R7: **0 results ⇒ empty state**; ≥1 ⇒ grid (R1,R4). The 0↔1 edge is the empty-state trigger. |
| B3 | `LIKE` **literal-vs-wildcard** edge | chars `%` and `_` | R4 "search by name": a typed `%`/`_` is a **literal** char of the name, **not** a wildcard. Wildcard meaning is **excluded**. |

> The high-value edges are **length-0 → show-all**, the **0→1 result** empty-state trigger, and
> the **literal-vs-wildcard** meaning boundary.

---

## Step 3–4 — Boundary cases

### B1 — keyword length (LB = 0; no spec'd UB)

| ID | Variable | Boundary b (operator, rule) | Value tested (len) | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------------|--------------|---------------------|--------|
| BVA-01 | keyword length | 0 (empty ⇒ show all, R1,R4) | `` (0) | 5 seeded | Returns **all 5** (empty ⇒ listing) | LB (on) |
| BVA-02 | keyword length | 0→1 | `i` (1) | 5 seeded | Returns every product whose name contains `i` (R4) | LB+1 |
| BVA-03 | keyword length | 1→2 | `iP` (2) | 5 seeded | Narrows toward iPhone (R4) | just inside |
| BVA-04 | keyword length | UB≈255 (no cap, R4) | 255-char non-matching string | 5 seeded | 0 results + empty state, no error (R4,R7) | UB−1 (typical) |
| BVA-05 | keyword length | UB≈256 | 256-char string | 5 seeded | Same, graceful; `spec-undefined` re: any cap | UB / UB+1 |
| BVA-06 | keyword length | largest allowed via UI | 10 000-char string | 5 seeded | No crash/500; empty state (R4,R7) | extreme max |

### B2 — result-set size (LB = 0 empty-state trigger; UB = 5)

| ID | Variable | Boundary b (operator, rule) | Value tested | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------|--------------|---------------------|--------|
| BVA-07 | result count | 0 (R7 empty state) | search `Keychron` after deleting it | 4 remain | 0 results ⇒ **empty-state message** (R7) | LB (0 results) |
| BVA-08 | result count | 0→1 | search `Keychron` | 5 seeded | Exactly **1** product in grid (R1,R4) | LB+1 (1 result) |
| BVA-09 | result count | UB = 5 (all) | search `` or a term in every name | 5 seeded | **All 5** in grid (R1) | UB (max) |

### B3 — `LIKE` literal-vs-wildcard edge (meaning boundary — highest value)

| ID | Variable | Boundary b (operator, rule) | Value tested | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------|--------------|---------------------|--------|
| BVA-10 | wildcard char | `%` as **literal** (R4 "by name") | `%` | 5 seeded | Literal char → **0 results** (no name contains `%`); must **NOT** return all products (R4,R7) | literal/wildcard edge |
| BVA-11 | wildcard char | `_` as literal (R4) | `Mac_ook` | 5 seeded | Literal `_` ≠ any char → **0 results**; must not match `MacBook` (R4) | single-char wildcard edge |
| BVA-12 | wildcard char | `%` mid-term (R4) | `Mac%Pro` | 5 seeded | Literal `%` → 0 results; must not match `MacBook Pro` via wildcard (R4) | wildcard-in-middle edge |

### Match-position edges (substring boundary within a name)

| ID | Variable | Boundary b (operator, rule) | Value tested | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------|--------------|---------------------|--------|
| BVA-13 | match position | prefix (R4) | `iPhone` | 5 seeded | Matches at start of name (R4) | LB of substring |
| BVA-14 | match position | suffix (R4) | `Ultra` | 5 seeded | Matches `Samsung … S24 Ultra` (R4) | UB of substring |
| BVA-15 | match position | just-off by one char (R4) | `MacBookX` | 5 seeded | 0 results — no name contains this (R4,R7) | off-by-one edge |

---

## Coverage check (skill checklist)

- [x] Method summary + boundary rationale (mis-specified inequality / mistyped value).
- [x] Each boundary has its LB/UB straddle set + extremes: B1→BVA-01…06; B2→BVA-07…09; B3→BVA-10…12; +position BVA-13…15.
- [x] Operator/inclusivity stated: length-0 ⇒ show-all; 0-result ⇒ empty state; `%`/`_` **excluded** from wildcard meaning (literal only).
- [x] String-length + robustness (`0,1,255,256,10000`) and 0/1/all result-count edges covered.
- [x] Every *Expected* cites a rule; no cap ⇒ `spec-undefined` (BVA-05).
- [x] No duplication with `FR-05-domain.md` (class reps there; edges here).

## Highest-value boundary in FR-05
**BVA-10 (`search = %`)** — the FR-05 analogue of FR-09's `>=` edge. A name search must treat `%`
as a **literal** (0 results), but an implementation that interpolates the term into a SQL `LIKE`
pattern treats `%` as *match-everything* and returns **all 5** — the "inequality/semantics
mis-specified" defect, detectable **only** at this boundary. Design and run it explicitly.

## Execution notes
Reset catalog (`node database.js`) before BVA-07/09 fixtures. Capture raw JSON (Postman/cURL) for
BVA-10/11/12 to confirm the exact row set (the UI can hide a wildcard leak). Record
Actual/Status/Evidence in the shared results table (workflow §6).
