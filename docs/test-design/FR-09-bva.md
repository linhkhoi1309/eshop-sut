# FR-09 — Discount Coupons — Boundary Value Analysis (BVA)

> **Technique:** BVA = **Step 4 of Domain Testing** (course lecture **CSC13003 — S04**). *A
> program is more likely to fail at a boundary.* Best representatives of ordered fields are edge
> values. **Boundary rationale (lecture):** boundary tests catch the two edge defects a nominal
> value misses — an **inequality mis-specified** (`>` where `>=` intended) and a **boundary value
> mistyped**. **Model:** `LB−1/LB/LB+1`, `UB−1/UB/UB+1`, extremes, nominal. **Oracle =
> `README.md` FR-09**; **no PASS/FAIL** here. Complements `FR-09-domain.md` — **edges only**.
>
> **Endpoint:** `POST /api/apply-coupon {code, total_amount, user_id}`.
> **Today (for date boundary):** 2026-07-04.

---

## Step 1–2 — Boundaries & operators

| # | Variable | Boundary b | Operator / inclusivity (spec) |
|---|----------|------------|-------------------------------|
| B1 | `total_amount` vs `min_order_amount` | per coupon: 300,000 (SAVE10/VIP100), 500,000 (BIGBUY), 100,000 (EXPIRED) | **C3: `total >= min`** → value **at** min is **INCLUSIVE (valid)** |
| B2 | prior-usage count vs `max_uses_per_user` | 1 (SAVE10/BIGBUY/EXPIRED), 2 (VIP100) | **C5: `uses < max`** → uses **at** max is **EXCLUSIVE (reject)** |
| B3 | now vs `expired_at` | SAVE10=2099-12-31 (future), EXPIRED=2020-01-01 (past) | **C2: `now < expired_at`** → date **on/after** expiry is invalid |
| B4 | `total_amount` sign/type | 0 | amount must be a positive order total (0/negative below any min ⇒ reject) |

> **B1 is the single highest-value boundary in the whole assignment** — see the callout below.

---

## Step 3–4 — Boundary cases

### B1 — `total_amount >= min_order_amount` (C3, inclusive). The critical `>=` edge.

| ID | Variable | Boundary b (operator, rule) | Value | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|-------|--------------|---------------------|--------|
| BVA-01 | total_amount | 300000 (>=, C3, SAVE10) | 299,999 | SAVE10, user 2, 0 uses | **Reject** — below min | LB−1 |
| BVA-02 | total_amount | 300000 (>=, C3, SAVE10) | **300,000** | SAVE10, user 2, 0 uses | **APPLY** — discount 30,000; final 270,000 (inclusive `>=`) | **LB (on — key case)** |
| BVA-03 | total_amount | 300000 (>=, C3, SAVE10) | 300,001 | SAVE10, user 2, 0 uses | Apply — discount ≈30,000 | LB+1 |
| BVA-04 | total_amount | 500000 (>=, C3, BIGBUY) | 499,999 | BIGBUY, user 2 | Reject — below min | LB−1 |
| BVA-05 | total_amount | 500000 (>=, C3, BIGBUY) | **500,000** | BIGBUY, user 2 | **APPLY** — discount 50,000; final 450,000 | **LB (on)** |
| BVA-06 | total_amount | 500000 (>=, C3, BIGBUY) | 500,001 | BIGBUY, user 2 | Apply — discount 50,000 | LB+1 |
| BVA-07 | total_amount | 300000 (>=, C3, VIP100) | 299,999 | VIP100, user 2 | Reject — below min | LB−1 |
| BVA-08 | total_amount | 300000 (>=, C3, VIP100) | **300,000** | VIP100, user 2 | **APPLY** — discount 100,000; final 200,000 | **LB (on)** |
| BVA-09 | total_amount | 300000 (>=, C3, VIP100) | 300,001 | VIP100, user 2 | Apply — discount 100,000 | LB+1 |

### B2 — prior-usage `< max_uses_per_user` (C5, exclusive at max)

| ID | Variable | Boundary b (operator, rule) | Value (prior uses) | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------------|--------------|---------------------|--------|
| BVA-10 | usage count | 1 (<, C5, SAVE10) | 0 prior uses | SAVE10, total 300k | Apply (0 < 1) | LB (below max) |
| BVA-11 | usage count | 1 (<, C5, SAVE10) | **1 prior use (=max)** | SAVE10, total 300k | **Reject** — limit reached (`uses < max`, 1<1 false) | **b (exclusive edge)** |
| BVA-12 | usage count | 1 (<, C5, SAVE10) | 2 prior uses (>max) | SAVE10, total 300k | Reject — over limit | b+1 |
| BVA-13 | usage count | 2 (<, C5, VIP100) | 1 prior use | VIP100, total 300k | Apply (1 < 2) | UB−1 |
| BVA-14 | usage count | 2 (<, C5, VIP100) | **2 prior uses (=max)** | VIP100, total 300k | **Reject** — limit reached (2<2 false) | **UB (exclusive edge)** |
| BVA-15 | usage count | 2 (<, C5, VIP100) | 3 prior uses | VIP100, total 300k | Reject | UB+1 |

### B3 — expiry date `now < expired_at` (C2)

| ID | Variable | Boundary b (operator, rule) | Value | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|-------|--------------|---------------------|--------|
| BVA-16 | expiry | expired_at (<, C2) | coupon expiring **yesterday** (2026-07-03) | seed a coupon min≤total | Reject — expired | day-after cutoff |
| BVA-17 | expiry | expired_at (<, C2) | coupon expiring **today** (2026-07-04) | seeded, total ≥ min | **Edge** — reject once `now >= expired_at`; `spec-undefined` on same-day time-of-day | day-of cutoff |
| BVA-18 | expiry | expired_at (<, C2) | coupon expiring **tomorrow** (2026-07-05) | seeded, total ≥ min | Apply — still valid | day-before cutoff |
| BVA-19 | expiry | expired_at (<, C2) | EXPIRED (2020-01-01), total 200k (≥ min 100k) | logged in | Reject — expired (isolates C2 above the min threshold) | far-past |

### B4 — amount sign/type extremes

| ID | Variable | Boundary b (operator, rule) | Value | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|-------|--------------|---------------------|--------|
| BVA-20 | total_amount | 0 (positive order total) | 0 | SAVE10, user 2 | Reject — below min / invalid amount (C3) | zero |
| BVA-21 | total_amount | negative | −1 | SAVE10, user 2 | Reject — invalid / below min; `spec-undefined` on negatives | below-zero |
| BVA-22 | total_amount | largest allowed | 9,999,999,999 | SAVE10, user 2 | Apply; discount = amount×10/100 (probe overflow/rounding) | extreme max |

---

## Coverage check (skill checklist)

- [x] Method summary + boundary rationale (mis-specified inequality / mistyped value).
- [x] Each boundary straddled: B1 LB−1/LB/LB+1 for **every** coupon min; B2 max−1/max/max+1 for both usage caps; B3 day before/of/after; B4 0/negative/extreme.
- [x] Operator + inclusivity stated per boundary (C3 `>=` inclusive; C5 `<` exclusive; C2 `<`).
- [x] Date and 0/negative/large numeric boundaries covered.
- [x] Every Expected cites the spec operator/rule; unknowns `spec-undefined` (BVA-17/21).
- [x] No duplication with `FR-09-domain.md` (class reps there; edges here).

## Highest-value boundary in FR-09
**BVA-02 / BVA-05 / BVA-08 — `total_amount == min_order_amount`.** Spec C3 is `>=` (inclusive), so
a coupon **must apply** at exactly the minimum. An implementation using `>` (the "inequality
mis-specified" defect) rejects **only** at this value and passes at 299,999-below and 300,001-above
alike — invisible to any nominal test. Run all three coupon variants; they are the assignment's
signature boundary case. Pair with **BVA-11/14** (the `<`-vs-`<=` usage-cap edge) and **BVA-17**
(same-day expiry).

## Execution notes
`node database.js` resets `coupon_usage` to empty. To set prior-usage state for BVA-11/12/14/15,
`POST /api/coupon-usage` (auth) the required number of times, or seed rows directly. For BVA-16/17/18
insert temporary coupons with the relevant `expired_at`. Capture each JSON response; record
Actual/Status/Evidence in the shared results table (workflow §6).
