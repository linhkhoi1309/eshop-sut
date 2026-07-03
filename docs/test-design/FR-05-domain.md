# FR-05 — Product Listing & Search — Domain Testing (Equivalence Class Partitioning)

> **Technique:** Domain Testing per course lecture **CSC13003 — S04**. Domain testing is a
> *stratified sampling* strategy: partition each variable's domain into equivalence classes
> (two inputs share a class iff the spec expects the **same result**) and test one **best
> representative** per class. **General Approach — 4 steps:** (1) identify **Input & Output**
> variables → (2) equivalence classes (valid + invalid) → (3) best representative → (4) ordered
> fields' representatives are boundary values (→ `FR-05-bva.md`).
>
> **Coverage rules (Step 3):** *valid* classes are **combined** into few dense tests; each
> *invalid* class is **isolated** in its own test (one invalid per case, so one rejection can't
> mask another). **Oracle = `README.md` FR-05 only** (never the code); undefined behavior marked
> `spec-undefined`; **no PASS/FAIL** assigned here (execution decides).
>
> **Endpoint:** `GET /api/products?search=<keyword>` + the Web home/listing page.
> **Seed:** 5 products — `iPhone 15 Pro Max`, `Samsung Galaxy S24 Ultra`, `MacBook Pro M3`,
> `Tai nghe AirPods Pro 2`, `Bàn phím cơ Keychron Q1`; categories `1/2/3`.

---

## Step 1 — Input & Output variables

**Testable rules (README lines 73–81):** R1 all products in a **grid**; R2 each product shows
**Image (+alt)**, **Name**, **Price**; R3 price in **`₫`** with **thousands separators**; R4
search **by name**; R5 term **rendered safely (no HTML)** (SEC-04); R6 **loading** state; R7
**empty state** on no results; R8 **exactly one `<h1>`**.

| Kind | Variable | Domain |
|------|----------|--------|
| **Input** | `search` keyword | any string |
| **State** | product set | 0 / some / all 5 |
| **State** | network speed | fast / throttled (R6) |
| **Output** | product grid (success) | 0..N matching rows rendered as grid |
| **Output** | empty-state message | shown iff 0 results (R7) |
| **Output** | loading indicator | shown during fetch (R6) |
| **Output** | rendered term | escaped text, never executed HTML (R5) |

---

## Step 2 — Complete set of equivalence classes (valid + invalid)

| EC | Variable (In/Out) | Condition | Class (valid/invalid) | Representative |
|----|-------------------|-----------|-----------------------|----------------|
| EC1 | search (in) | matches a name (R4) | valid: exact name | `iPhone 15 Pro Max` |
| EC2 | search (in) | matches a name (R4) | valid: partial substring | `Mac` |
| EC3 | search (in) | matches many (R4) | valid: multi-hit substring | `Pro` |
| EC4 | search (in) | case (R4) | valid: different case | `iphone` |
| EC5 | search (in) | charset (R4) | valid: Vietnamese diacritics | `Bàn phím` |
| EC6 | search (in) | empty ⇒ listing (R1,R4) | valid: empty term | `` |
| EC7 | search (in) | accent-folding | *unspecified* → split-probe | `Ban phim` → **spec-undefined** |
| EC8 | search (in) | whitespace/trim | *unspecified* → probe | `"  Mac  "` → **spec-undefined** |
| EC9 | search (in) | no match (R4→R7) | valid: non-matching term | `zzzzz` |
| EC10 | search (in) | safe render "must-be" (R5) | **invalid**: HTML markup | `<b>hi</b>` |
| EC11 | search (in) | safe render (R5,SEC-04) | **invalid**: script payload | `<script>alert(1)</script>` |
| EC12 | search (in) | safe render (R5) | **invalid**: img onerror | `<img src=x onerror=alert(1)>` |
| EC13 | search (in) | param query (SEC-05) | **invalid**: SQL tautology | `' OR '1'='1` |
| EC14 | search (in) | param query (SEC-05) | **invalid**: SQL comment | `x'--` |
| EC15 | search (in) | param query (SEC-05) | **invalid**: destructive SQL | `'; DROP TABLE products;--` |
| EC16 | search (in) | robustness | **invalid**: oversized (10 000 ch) | huge string |
| EC17 | product set (state) | grid (R1) | valid: all products | 5 seeded |
| EC18 | product set (state) | empty catalog (R1,R7) | **invalid/edge**: 0 products | catalog emptied |
| EC19 | network (state) | loading (R6) | valid: slow fetch | throttled |
| EC-O1 | grid (out) | R1,R2 | success: matching rows in grid | rendered grid |
| EC-O2 | empty msg (out) | R7 | success: empty-state shown | friendly message |
| EC-O3 | loading (out) | R6 | success: loading indicator | spinner/skeleton |
| EC-O4 | safe render (out) | R5 | success: term escaped, no JS run | literal text |
| EC-O5 | alt text (out) | R2,FR-24 | success: non-empty `alt` per image | descriptive alt |
| EC-O6 | price format (out) | R3 | success: `₫` + thousands sep | `30.000.000 ₫` |
| EC-O7 | heading (out) | R8 | success: exactly one `<h1>` | single h1 |

---

## Step 3 — Selected test cases (valid combined, invalid isolated)

### Valid classes — combined into few dense tests

| ID | Classes covered (EC) | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|----------------------|---------------|--------------|--------------------------|-----------|
| DT-01 | EC1,EC-O1,EC-O5,EC-O6,EC-O7 | search `iPhone 15 Pro Max`; inspect result page | 5 seeded | Returns that product in a grid; image has alt; price `30.000.000 ₫`; exactly one `<h1>` (R1,R2,R3,R8) | packs exact-match + all display outputs |
| DT-02 | EC2,EC-O1 | search `Mac` | 5 seeded | Returns `MacBook Pro M3` (R4) | partial-match valid |
| DT-03 | EC3,EC-O1 | search `Pro` | 5 seeded | Returns all names containing "Pro" (iPhone…, MacBook…, AirPods…) (R4) | multi-hit valid |
| DT-04 | EC4 | search `iphone` | 5 seeded | Returns iPhone product (R4) — else `spec-undefined` on case | case dimension |
| DT-05 | EC5 | search `Bàn phím` | 5 seeded | Returns Keychron product (R4) | diacritics valid |
| DT-06 | EC6,EC17,EC-O1 | search `` (blank) | 5 seeded | Returns **all 5** as grid (R1,R4) | empty ⇒ listing |
| DT-07 | EC9,EC-O2 | search `zzzzz` | 5 seeded | 0 results + **empty-state** message (R7) | no-match + empty output |
| DT-08 | EC19,EC-O3 | search on throttled network | 5 seeded | **Loading** indicator visible during fetch (R6) | loading output |

### Invalid / adversarial classes — one isolated per test (R5, SEC-04/05)

| ID | Class covered (EC) | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|--------------------|---------------|--------------|--------------------------|-----------|
| DT-09 | EC10 (only) | search `<b>hi</b>` | 5 seeded | Term shown as literal text, **not** bold-rendered; 0 results + empty state (R5,R7) | HTML render isolated |
| DT-10 | EC11 (only) | search `<script>alert(1)</script>` | 5 seeded | **No script executes**; term escaped on screen (R5,SEC-04) | XSS isolated |
| DT-11 | EC12 (only) | search `<img src=x onerror=alert(1)>` | 5 seeded | No JS executes; rendered safely (R5) | XSS variant isolated |
| DT-12 | EC13 (only) | search `' OR '1'='1` (capture raw JSON) | 5 seeded | Literal name search → **0 results**; must **not** return all/other rows (R4,SEC-05) | SQLi tautology isolated |
| DT-13 | EC14 (only) | search `x'--` | 5 seeded | Literal search → 0 results; no 500/leak (R4,SEC-05) | SQLi comment isolated |
| DT-14 | EC15 (only) | search `'; DROP TABLE products;--` | fresh DB | Table intact; safe literal search (SEC-05) | destructive SQLi isolated |
| DT-15 | EC16 (only) | search 10 000-char string | 5 seeded | Handled gracefully: 0 results/empty state, no crash (R4,R7) | robustness isolated |
| DT-16 | EC18 (only) | view listing with catalog emptied | 0 products | Suitable empty-state, not a broken grid (R1,R7) | empty-catalog isolated |

### Interaction cases (spec-implied)

| ID | Interaction | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|-------------|---------------|--------------|--------------------------|-----------|
| DT-17 | R5 × R7 (payload on the empty-state path) | search `<script>alert(1)</script>` and read the "no results" message | 5 seeded | Empty-state message must **not** echo the raw term as executable HTML (R5,R7) | escaping must hold on the empty path too |
| DT-18 | EC7 vs EC4 (accent-fold × case) | search `ban phim` (no marks, lower) | 5 seeded | `spec-undefined` — probe accent-folding + case together | double-dimension edge |

---

## Coverage check (skill checklist)

- [x] 4-step approach named; method summary at top.
- [x] **Output** variables partitioned (EC-O1…EC-O7), not only inputs.
- [x] Complete partition table (EC1…) precedes selected cases.
- [x] Valid classes **combined** (DT-01…08); every invalid class **isolated** (DT-09…16).
- [x] Adversarial classes for R5/SEC-04/SEC-05 present; interaction cases DT-17/18.
- [x] Every *Expected* cites a rule; unknowns marked `spec-undefined` (EC7/EC8, DT-04/18).
- [x] Ordered/length edges handed to **`FR-05-bva.md`** (keyword length, `LIKE` wildcard, result count).

## Execution notes (fill during run — this file stays design-only)
Record Actual/Status/Evidence in the shared results table (workflow §6). Reset catalog
(`node database.js`) before DT-14/16. Use DevTools to confirm no script runs (DT-10/11/17) and to
inspect DOM for alt/price/`<h1>` (DT-01). Capture raw JSON (Postman/cURL) for DT-12/13 to detect a
row leak the UI could hide.
