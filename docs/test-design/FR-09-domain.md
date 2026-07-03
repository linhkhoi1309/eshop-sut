# FR-09 — Discount Coupons — Domain Testing (Equivalence Class Partitioning)

> **Technique:** Domain Testing per course lecture **CSC13003 — S04**. Partition each variable's
> domain into valid/invalid equivalence classes (two inputs share a class iff the spec expects the
> **same result**) and test one **best representative** per class. **4-step approach:** (1) Input &
> Output variables → (2) equivalence classes → (3) best representative → (4) ordered fields →
> boundaries (`FR-09-bva.md`). **Coverage (Step 3):** *valid* classes **combined**; each *invalid*
> class **isolated** (one per test). **Oracle = `README.md` FR-09 only**; `spec-undefined` where
> silent; **no PASS/FAIL** (execution decides).
>
> **Endpoint:** `POST /api/apply-coupon` body `{code, total_amount, user_id}`.
> **Spec (README 110–135):** a coupon applies **iff all 5 conditions hold** —
> **C1** code exists & `is_active=1`; **C2** not expired (now < `expired_at`);
> **C3** `total_amount >= min_order_amount`; **C4** user logged in (valid JWT);
> **C5** user's prior uses `< max_uses_per_user`. Formulas: `percent → total×value/100`;
> `fixed → value`; `final = total − discount`.
> **Seed coupons:**

| code | type | value | min_order | expired_at | max_uses/user |
|------|------|-------|-----------|------------|----------------|
| SAVE10 | percent | 10 | 300,000 | 2099-12-31 | 1 |
| BIGBUY | fixed | 50,000 | 500,000 | 2099-12-31 | 1 |
| VIP100 | fixed | 100,000 | 300,000 | 2099-12-31 | 2 |
| EXPIRED | percent | 20 | 100,000 | 2020-01-01 | 1 |

---

## Step 1 — Input & Output variables

| Kind | Variable | Domain |
|------|----------|--------|
| **Input** | `code` | exists+active / exists+inactive / not-exist / empty / wrong-case / injection |
| **Input** | `total_amount` | ordered ₫ amount: below/at/above `min_order_amount`; 0; negative |
| **Input** | `user_id` / login state | valid JWT (logged in) / anonymous (no token, no user_id) |
| **State** | coupon `type` | `percent` / `fixed` (drives formula) |
| **State** | prior usage count | 0 / <max / =max / >max |
| **State** | `expired_at` vs now | future / past |
| **Output** | success payload | `{discount_amount, final_amount, success:true, message}` |
| **Output** | error: not-exist/inactive (C1) | "Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa" |
| **Output** | error: expired (C2) | "Mã giảm giá đã hết hạn" |
| **Output** | error: below min (C3) | "Đơn hàng chưa đủ giá trị tối thiểu …" |
| **Output** | error: not logged in (C4) | rejection (must require valid JWT) |
| **Output** | error: uses exhausted (C5) | "Bạn đã sử dụng mã này … (đã đạt giới hạn)" |
| **Output** | error: empty code | "Vui lòng nhập mã giảm giá" |

---

## Step 2 — Complete set of equivalence classes

| EC | Variable (In/Out) | Condition | Class (valid/invalid) | Representative |
|----|-------------------|-----------|-----------------------|----------------|
| EC1 | code (in) | C1 exists & active | valid: active code | `SAVE10` |
| EC2 | code (in) | C1 | invalid: not in DB | `NOPE999` |
| EC3 | code (in) | C1 `is_active=1` | invalid: inactive code | an `is_active=0` code |
| EC4 | code (in) | required | invalid: empty | `` |
| EC5 | code (in) | case handling | valid/probe: wrong case | `save10` → **spec-undefined** |
| EC6 | code (in) | param query (SEC-05) | invalid: SQL injection | `' OR '1'='1` |
| EC7 | type (state) | formula split | valid: `percent` | SAVE10 |
| EC8 | type (state) | formula split | valid: `fixed` | BIGBUY |
| EC9 | total_amount (in) | C3 `>= min` | valid: at/above min | 300,000 (SAVE10) |
| EC10 | total_amount (in) | C3 | invalid: below min | 299,999 (SAVE10) |
| EC11 | total_amount (in) | sign/type | invalid: zero | 0 |
| EC12 | total_amount (in) | sign/type | invalid: negative | −100,000 |
| EC13 | expired_at (state) | C2 not expired | valid: future date | SAVE10 (2099) |
| EC14 | expired_at (state) | C2 | invalid: expired | EXPIRED (2020) |
| EC15 | login (in) | C4 logged in | valid: valid JWT + user_id | test user (id 2) |
| EC16 | login (in) | C4 | invalid: anonymous | no token / no user_id |
| EC17 | usage (state) | C5 `< max` | valid: uses < max | 0 of 1 (SAVE10) |
| EC18 | usage (state) | C5 | invalid: uses = max (exhausted) | 1 of 1 (SAVE10) |
| EC19 | usage (state) | C5 | invalid: uses > max | 2 of 1 |
| EC-O1 | success (out) | percent formula | discount = total×value/100 | SAVE10 @300k → 30,000 |
| EC-O2 | success (out) | fixed formula | discount = value | BIGBUY @500k → 50,000 |
| EC-O3 | final (out) | `final = total − discount` | correct final_amount | 300k−30k = 270,000 |

> **"All-5-conditions" note:** C1–C5 are ANDed. Each invalid class (EC2/3/4, EC10, EC14, EC16,
> EC18/19) is a *distinct rejection output* → per Step 3 each gets its own isolated test.

---

## Step 3 — Selected test cases

### Valid classes — combined (positive paths, one per formula type)

| ID | Classes (EC) | Input | Precondition | Expected (per spec rule) | Rationale |
|----|--------------|-------|--------------|--------------------------|-----------|
| DT-01 | EC1,EC7,EC9,EC13,EC15,EC17,EC-O1,EC-O3 | code=SAVE10, total=300000, user=2 | logged in; 0 prior uses; DB reset | Applies; **discount=30,000; final=270,000** (percent: 300000×10/100; C1-C5 all hold) | packs all valid percent classes |
| DT-02 | EC1,EC8,EC-O2,EC-O3 | code=BIGBUY, total=500000, user=2 | logged in; 0 uses | Applies; **discount=50,000; final=450,000** (fixed) | valid fixed-type path |
| DT-03 | EC8,EC17,EC-O2 | code=VIP100, total=300000, user=2 | logged in; 1 of 2 prior uses | Applies (uses 1 < max 2); discount=100,000; final=200,000 (C5) | valid: usage below max |

### Invalid classes — one isolated per test

| ID | Class (EC) | Input | Precondition | Expected (per spec rule) | Rationale |
|----|-----------|-------|--------------|--------------------------|-----------|
| DT-04 | EC2 (only) | code=NOPE999, total=500000, user=2 | logged in | Reject: code doesn't exist (C1) | C1 not-exist isolated |
| DT-05 | EC3 (only) | inactive code, total=500000, user=2 | an inactive coupon seeded | Reject: inactive (C1 `is_active=1`) | C1 inactive isolated |
| DT-06 | EC4 (only) | code=``, total=500000, user=2 | logged in | Reject: "Vui lòng nhập mã giảm giá" | empty-code isolated |
| DT-07 | EC10 (only) | code=SAVE10, total=299999, user=2 | logged in | Reject: below min 300,000 (C3) | C3 below-min isolated |
| DT-08 | EC14 (only) | code=EXPIRED, total=200000, user=2 | logged in (total ≥ min 100k so only expiry fails) | Reject: expired (C2) | C2 expiry isolated |
| DT-09 | EC16 (only) | code=SAVE10, total=500000, **no token/no user_id** | anonymous | Reject: must be logged in (C4) | C4 auth isolated |
| DT-10 | EC18 (only) | code=SAVE10, total=500000, user=2 | user has **1 prior use** (=max) | Reject: uses exhausted (C5 `uses < max`) | C5 at-limit isolated |
| DT-11 | EC11 (only) | code=SAVE10, total=0, user=2 | logged in | Reject: below min (C3) / invalid amount | zero-amount isolated |
| DT-12 | EC12 (only) | code=SAVE10, total=−100000, user=2 | logged in | Reject: invalid/below min (C3) — else `spec-undefined` on negatives | negative-amount isolated |
| DT-13 | EC6 (only) | code=`' OR '1'='1`, total=500000, user=2 | logged in | Reject safely as non-existent code; no SQL leak (C1, SEC-05) | injection isolated |
| DT-14 | EC5 (only) | code=`save10`, total=500000, user=2 | logged in | `spec-undefined` — probe case-sensitivity of code lookup | case dimension |

### Interaction cases (C1–C5 are ANDed — probe multi-condition)

| ID | Interaction | Input | Precondition | Expected (per spec rule) | Rationale |
|----|-------------|-------|--------------|--------------------------|-----------|
| DT-15 | C2 × C3 (expired **and** below-min) | code=EXPIRED, total=50000 (< min 100k) | logged in | Reject (fails C2 and C3) — verify expiry is enforced even when order is below min | catches "expiry only checked above min" |
| DT-16 | C4 × C5 (anonymous ⇒ usage-limit unenforceable) | code=VIP100, total=300000, **no user_id**, applied repeatedly | anonymous | Reject at C4; must **not** allow unlimited use by omitting user_id (C4,C5) | auth-gate protects usage cap |
| DT-17 | type × formula correctness | code=SAVE10, total=1,000,000, user=2 | logged in; 0 uses | discount=100,000; final=900,000 (percent 10%) | verifies percent formula, not `total×(1−value)` |

---

## Coverage check (skill checklist)

- [x] 4-step approach named; method summary present.
- [x] **Output** classes partitioned (EC-O1…3 + 6 distinct error outputs), not only inputs.
- [x] Complete partition table (EC1…EC19 + outputs) precedes selected cases.
- [x] Valid classes **combined** (DT-01…03); each invalid class **isolated** (DT-04…14).
- [x] Injection (EC6/DT-13) + auth-state (EC16/DT-09/16) classes present.
- [x] Interaction cases DT-15/16/17 cover the ANDed C1–C5 conditions & formula.
- [x] Unknowns marked `spec-undefined` (EC5, DT-12/14).
- [x] Ordered fields (`total_amount`, `max_uses_per_user`, `expired_at`) handed to **`FR-09-bva.md`**.

## Execution notes (design-only file)
`node database.js` to reset before any usage-dependent case (DT-03/10) — usage lives in
`coupon_usage`, seeded empty. To set up DT-10, POST to `/api/coupon-usage` once (or seed) so the
user has 1 prior SAVE10 use. Capture the JSON response for every case; record Actual/Status/
Evidence in the shared results table (workflow §6). **The percent formula (DT-01/17) and the
anonymous-user gap (DT-09/16) are the highest-risk classes — verify carefully.**
