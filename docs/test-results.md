# EShop — Test Execution Report

- **When:** 2026-07-03T23:48:41.444Z   **Backend:** http://localhost:3000   **Commit:** `6cdd618`   **DB:** reseeded on server boot (clean)
- **Source design:** `docs/test-design-report.md` (124 cases)   **Harness:** `tests/runner.mjs`   **Node:** v22.17.1
- **Oracle:** `README.md`. A **FAIL = candidate spec-violation bug**, not a broken test. MANUAL/PROBE are not pass/fail.

## Summary

| Status | Count |
|--------|------:|
| PASS | 61 |
| FAIL | 23 |
| MANUAL | 22 |
| PROBE | 18 |
| ERROR | 0 |
| **Total** | **124** |

| Feature | PASS | FAIL | MANUAL | PROBE | ERROR |
|---------|-----:|-----:|-------:|------:|------:|
| FR-05 Search | 18 | 5 | 7 | 3 | 0 |
| FR-09 Coupons | 26 | 9 | 1 | 3 | 0 |
| FR-14 Category CRUD | 9 | 7 | 1 | 11 | 0 |
| FR-10 Cancel (Mobile) | 8 | 2 | 13 | 1 | 0 |

## Candidate bugs — 7 distinct defects across 23 failing cases

_Verified against actual responses. Order roughly by severity._

### BUG-01 — [FR-09] Coupon rejected when order total exactly equals the minimum (`>` used instead of `>=`)
- **Severity:** High
- **Spec:** FR-09 C3 — “Tổng đơn hàng **>=** min_order_amount”
- **Suspected cause:** `apply-coupon` uses `total_amount > coupon.min_order_amount` (strict); should be `>=`.
- **Failing cases (5):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR09-BVA-02 | APPLY at exactly min; discount 30,000; final 270,000 (C3 '>=', LB) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để áp dụng mã … |
  | FR09-BVA-05 | APPLY at min; discount 50,000; final 450,000 (BIGBUY LB) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 500,000 ₫ để áp dụng mã … |
  | FR09-BVA-08 | APPLY at min; discount 100,000; final 200,000 (VIP100 LB) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để áp dụng mã … |
  | FR09-DT-01 | Apply; discount 30,000; final 270,000 (SAVE10 percent) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để áp dụng mã … |
  | FR09-DT-02 | Apply; discount 50,000; final 450,000 (BIGBUY fixed) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 500,000 ₫ để áp dụng mã … |

### BUG-02 — [FR-09] Percent discount formula wrong → negative discounts / inflated totals
- **Severity:** High
- **Spec:** FR-09 — “percent → total × value / 100”
- **Suspected cause:** Code computes `discount = floor(total × (1 − discount_value))`; for value=10 this is a large negative number.
- **Failing cases (3):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR09-DT-17 | discount 100,000; final 900,000 (percent 10% of 1,000,000) | status 200 {"success":true,"coupon_id":1,"discount_amount":-9000000,"final_amoun… |
  | FR09-BVA-03 | Apply just above min; real discount (LB+1) | status 200 {"success":true,"coupon_id":1,"discount_amount":-2700009,"final_amoun… |
  | FR09-BVA-22 | Apply; discount = 999,999,999 (10% of 9,999,999,999) — probe overflow/… | status 200 {"success":true,"coupon_id":1,"discount_amount":-89999999991,"final_a… |

### BUG-03 — [FR-09] Coupon applies without login (C4 not enforced)
- **Severity:** High
- **Spec:** FR-09 C4 / SEC-02 — user must have a valid JWT
- **Suspected cause:** `/api/apply-coupon` has no auth middleware and treats `user_id` as optional; anonymous request is accepted.
- **Failing cases (1):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR09-DT-09 | Reject — must be logged in (C4) | status 200 {"success":true,"coupon_id":1,"discount_amount":-4500000,"final_amoun… |

### BUG-04 — [FR-05] SQL injection & LIKE-wildcard leak in product search
- **Severity:** Critical
- **Spec:** FR-05 R4/R5 + SEC-04/SEC-05 — search by name, safe/parameterised
- **Suspected cause:** `WHERE name LIKE '%<term>%'` built by string concatenation; `'`, `%`, `_`, `OR 1=1` are interpreted, not treated as literals.
- **Failing cases (5):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR05-DT-12 | Literal → 0 results; must NOT return all/other rows (R4/SEC-05) | 5 rows |
  | FR05-DT-13 | Literal → 0 results; no 500 (R4/SEC-05) | 1 rows |
  | FR05-BVA-10 | `%` is literal ⇒ 0 results; must NOT return all products (R4/R7) | 5 rows |
  | FR05-BVA-11 | `_` literal ⇒ 0 results; must not match MacBook (R4) | 1 rows |
  | FR05-BVA-12 | `%` literal ⇒ 0 results; must not match MacBook Pro (R4) | 1 rows |

### BUG-05 — [FR-14] Empty / whitespace category name accepted
- **Severity:** Medium
- **Spec:** FR-14 — “Tên danh mục là bắt buộc, không được để trống”
- **Suspected cause:** `POST /api/categories` performs no non-empty validation on `name`.
- **Failing cases (4):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR14-DT-03 | Reject — name required, not empty (FR-14) | status 200 |
  | FR14-DT-04 | Reject — whitespace-only = empty (FR-14) | status 200 |
  | FR14-BVA-01 | Reject — length 0 empty (FR-14) | status 200 |
  | FR14-BVA-04 | Reject — single space trims to empty (FR-14) | status 200 |

### BUG-06 — [FR-14] Category write endpoints accept a non-admin token (missing role check)
- **Severity:** High
- **Spec:** FR-12 / SEC-03 — admin routes must check `role='admin'`, not just token presence
- **Suspected cause:** `authenticateToken` verifies the JWT but never checks `role`; a normal user token can create/delete categories.
- **Failing cases (3):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR14-DT-05 | Reject 403 — non-admin cannot create (FR-12/SEC-03) | status 200 |
  | FR14-DT-07 | Reject 403 — non-admin delete (SEC-03) | status 200 |
  | FR14-DT-14 | Reject 403 — auth checked before validation (empty name × non-admin) | status 200 |

### BUG-07 — [FR-10] User can cancel a `shipping` order via the API (server does not enforce FR-20)
- **Severity:** High
- **Spec:** FR-10 / FR-20 — user may NOT self-cancel once `shipping`; only `pending`/`confirmed`
- **Suspected cause:** `/api/orders/:id/cancel` only rejects `delivered`/`canceled`; `shipping` falls through and is cancelled. The mobile UI hides the button (L1) but the server (L2) accepts it.
- **Failing cases (2):**

  | Case | Expected (spec) | Actual |
  |------|-----------------|--------|
  | FR10-DT-07 | Reject 4xx — user cannot cancel a shipping order via API (L2, FR-10) | status 200 |
  | FR10-BVA-06 | shipping (LB+1): PUT /cancel → reject 4xx (L2, KEY — masked bug) | status 200 |

## Full results

| Case | Status | Expected | Actual |
|------|--------|----------|--------|
| FR05-DT-01 | MANUAL | Product in grid; image alt; price 30.000.000 ₫; exactly one <h1> (R1/R… | (manual) |
| FR05-DT-02 | PASS | Returns MacBook Pro M3 (R4) | 1 rows |
| FR05-DT-03 | PASS | All names containing 'Pro' (R4) | 3 rows |
| FR05-DT-04 | PROBE | spec-undefined — case-insensitivity of search | 1 rows |
| FR05-DT-05 | PASS | Returns Keychron (R4) | 1 rows |
| FR05-DT-06 | PASS | Empty ⇒ all 5 products (R1/R4) | 5 rows |
| FR05-DT-07 | PASS | 0 results + empty state (R7) | 0 rows |
| FR05-DT-08 | MANUAL | Loading indicator visible during fetch (R6) | (manual) |
| FR05-DT-09 | MANUAL | `<b>hi</b>` shown as literal text, not bold (R5) | (manual) |
| FR05-DT-10 | MANUAL | No script executes; term escaped (R5/SEC-04) | (manual) |
| FR05-DT-11 | MANUAL | No JS executes from img onerror (R5) | (manual) |
| FR05-DT-12 | FAIL | Literal → 0 results; must NOT return all/other rows (R4/SEC-05) | 5 rows |
| FR05-DT-13 | FAIL | Literal → 0 results; no 500 (R4/SEC-05) | 1 rows |
| FR05-DT-14 | PASS | Table intact; injection is a safe literal (SEC-05) | 5 rows after |
| FR05-DT-15 | PASS | Graceful: 0 results, no crash (R4/R7) | 0 rows |
| FR05-DT-16 | MANUAL | Empty catalog ⇒ empty-state, not a broken grid (R1/R7) | (manual) |
| FR05-DT-17 | MANUAL | Empty-state message must not echo the raw term as HTML (R5/R7) | (manual) |
| FR05-DT-18 | PROBE | spec-undefined — accent-folding × case (`ban phim`) | 0 rows |
| FR05-BVA-01 | PASS | Length 0 ⇒ all 5 (R1) | 5 rows |
| FR05-BVA-02 | PASS | Products containing 'i' (R4) | 2 rows |
| FR05-BVA-03 | PASS | Narrows toward iPhone (R4) | 1 rows |
| FR05-BVA-04 | PASS | 255-char non-match ⇒ 0 results (R4/R7) | 0 rows |
| FR05-BVA-05 | PROBE | spec-undefined — 256-char (any cap?) | status 200, 0 rows |
| FR05-BVA-06 | PASS | 10 000-char ⇒ no crash, 0 results (R4/R7) | 0 rows |
| FR05-BVA-07 | PASS | 0-result side of the empty-state trigger (R7) | 0 rows |
| FR05-BVA-08 | PASS | Exactly 1 result (R1/R4) | 1 rows |
| FR05-BVA-09 | PASS | UB=5 ⇒ all products (R1) | 5 rows |
| FR05-BVA-10 | FAIL | `%` is literal ⇒ 0 results; must NOT return all products (R4/R7) | 5 rows |
| FR05-BVA-11 | FAIL | `_` literal ⇒ 0 results; must not match MacBook (R4) | 1 rows |
| FR05-BVA-12 | FAIL | `%` literal ⇒ 0 results; must not match MacBook Pro (R4) | 1 rows |
| FR05-BVA-13 | PASS | Prefix match (R4) | 1 rows |
| FR05-BVA-14 | PASS | Suffix match — Samsung … S24 Ultra (R4) | 1 rows |
| FR05-BVA-15 | PASS | Off-by-one ⇒ 0 results (R4/R7) | 0 rows |
| FR09-DT-01 | FAIL | Apply; discount 30,000; final 270,000 (SAVE10 percent) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-DT-02 | FAIL | Apply; discount 50,000; final 450,000 (BIGBUY fixed) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 500,000 ₫ để á… |
| FR09-DT-03 | PASS | Apply — usage 1 < max 2 (C5) | status 200 |
| FR09-DT-04 | PASS | Reject — code does not exist (C1) | status 404 {"error":"Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa"… |
| FR09-DT-05 | MANUAL | Reject — inactive coupon (C1 is_active=1) | (manual) |
| FR09-DT-06 | PASS | Reject — empty code ('Vui lòng nhập mã') | status 400 {"error":"Vui lòng nhập mã giảm giá"} |
| FR09-DT-07 | PASS | Reject — below min 300,000 (C3) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-DT-08 | PASS | Reject — expired (C2) | status 400 {"error":"Mã giảm giá đã hết hạn"} |
| FR09-DT-09 | FAIL | Reject — must be logged in (C4) | status 200 {"success":true,"coupon_id":1,"discount_amount":-4500000,"f… |
| FR09-DT-10 | PASS | Reject — uses = max (C5) | status 400 |
| FR09-DT-11 | PASS | Reject — below min / invalid amount (C3) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-DT-12 | PASS | Reject — invalid/below min (spec-undefined on negatives) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-DT-13 | PASS | Reject safely; no SQL leak (C1/SEC-05) | status 404 {"error":"Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa"… |
| FR09-DT-14 | PROBE | spec-undefined — coupon code case-sensitivity (`save10`) | status 404 {"error":"Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa"… |
| FR09-DT-15 | PASS | Reject — fails C2 and C3 (expired + below min) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 100,000 ₫ để á… |
| FR09-DT-16 | PASS | Reject — anonymous must not bypass usage cap via missing user_id (C4) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-DT-17 | FAIL | discount 100,000; final 900,000 (percent 10% of 1,000,000) | status 200 {"success":true,"coupon_id":1,"discount_amount":-9000000,"f… |
| FR09-BVA-01 | PASS | Reject — below min (LB−1) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-BVA-02 | FAIL | APPLY at exactly min; discount 30,000; final 270,000 (C3 '>=', LB) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-BVA-03 | FAIL | Apply just above min; real discount (LB+1) | status 200 {"success":true,"coupon_id":1,"discount_amount":-2700009,"f… |
| FR09-BVA-04 | PASS | Reject — below min (BIGBUY LB−1) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 500,000 ₫ để á… |
| FR09-BVA-05 | FAIL | APPLY at min; discount 50,000; final 450,000 (BIGBUY LB) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 500,000 ₫ để á… |
| FR09-BVA-06 | PASS | Apply just above min (BIGBUY LB+1) | status 200 {"success":true,"coupon_id":2,"discount_amount":50000,"fina… |
| FR09-BVA-07 | PASS | Reject — below min (VIP100 LB−1) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-BVA-08 | FAIL | APPLY at min; discount 100,000; final 200,000 (VIP100 LB) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-BVA-09 | PASS | Apply just above min (VIP100 LB+1) | status 200 {"success":true,"coupon_id":3,"discount_amount":100000,"fin… |
| FR09-BVA-10 | PASS | Apply — usage 0 < max 1 (SAVE10, above min) | status 200 |
| FR09-BVA-11 | PASS | Reject — uses = max 1 (C5 '<' edge) | status 400 |
| FR09-BVA-12 | PASS | Reject — uses > max 1 | status 400 |
| FR09-BVA-13 | PASS | Apply — uses 1 < max 2 (UB−1) | status 200 |
| FR09-BVA-14 | PASS | Reject — uses = max 2 (UB edge) | status 400 |
| FR09-BVA-15 | PASS | Reject — uses 3 > max 2 (UB+1) | status 400 |
| FR09-BVA-16 | PASS | Reject — expired yesterday (C2, day-after cutoff) | status 400 |
| FR09-BVA-17 | PROBE | spec-undefined — coupon expiring today (same-day time-of-day) | status 400 {"error":"Mã giảm giá đã hết hạn"} |
| FR09-BVA-18 | PASS | Apply — expires tomorrow, still valid (C2, day-before) | status 200 |
| FR09-BVA-19 | PASS | Reject — far-past expiry (EXPIRED 2020, above min) | status 400 {"error":"Mã giảm giá đã hết hạn"} |
| FR09-BVA-20 | PASS | Reject — total 0 (below min/invalid) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-BVA-21 | PROBE | spec-undefined — negative total (−1) | status 400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ để á… |
| FR09-BVA-22 | FAIL | Apply; discount = 999,999,999 (10% of 9,999,999,999) — probe overflow/… | status 200 {"success":true,"coupon_id":1,"discount_amount":-8999999999… |
| FR14-DT-01 | PASS | Created; appears in GET list (FR-14 Add+View) | create 200; in list true |
| FR14-DT-02 | PASS | Deleted; gone from list (FR-14 Delete) | delete 200 |
| FR14-DT-03 | FAIL | Reject — name required, not empty (FR-14) | status 200 |
| FR14-DT-04 | FAIL | Reject — whitespace-only = empty (FR-14) | status 200 |
| FR14-DT-05 | FAIL | Reject 403 — non-admin cannot create (FR-12/SEC-03) | status 200 |
| FR14-DT-06 | PASS | Reject 401 — token required (SEC-02/FR-12) | status 401 |
| FR14-DT-07 | FAIL | Reject 403 — non-admin delete (SEC-03) | status 200 |
| FR14-DT-08 | PROBE | spec: reject/no-op on non-existent id 9999 (no-op vs error undefined) | status 200 {"message":"Category deleted"} |
| FR14-DT-09 | MANUAL | Category name with <script> escaped on display, not executed (SEC-04) | (manual) |
| FR14-DT-10 | PASS | Categories table intact after SQL-meta name (SEC-05) | 7 categories |
| FR14-DT-11 | PROBE | spec-undefined — duplicate name 'Laptop' | status 200 |
| FR14-DT-12 | PROBE | spec-undefined — delete category id=1 that has products (integrity) | status 200 |
| FR14-DT-13 | PROBE | spec-undefined — numeric-only name '12345' | status 200 |
| FR14-DT-14 | FAIL | Reject 403 — auth checked before validation (empty name × non-admin) | status 200 |
| FR14-BVA-01 | FAIL | Reject — length 0 empty (FR-14) | status 200 |
| FR14-BVA-02 | PASS | Accept — length 1 non-empty (FR-14) | status 200 |
| FR14-BVA-03 | PASS | Accept — length 2 (FR-14) | status 200 |
| FR14-BVA-04 | FAIL | Reject — single space trims to empty (FR-14) | status 200 |
| FR14-BVA-05 | PROBE | spec-undefined — 255-char name (no max stated) | status 200 |
| FR14-BVA-06 | PROBE | spec-undefined — 256-char name | status 200 |
| FR14-BVA-07 | PASS | Graceful, no crash on 10 000-char name | status 200 |
| FR14-BVA-08 | PASS | Delete existing min id succeeds (FR-14) | status 200 |
| FR14-BVA-09 | PROBE | spec: id 0 (LB−1) reject/no-op | status 200 |
| FR14-BVA-10 | PROBE | spec: id −1 (negative) reject/no-op | status 200 |
| FR14-BVA-11 | PASS | Delete existing max id succeeds (FR-14) | status 200 |
| FR14-BVA-12 | PROBE | spec: id just past max (UB+1) not found/no-op | status 200 |
| FR14-BVA-13 | PROBE | spec: id far above range no-op | status 200 |
| FR14-BVA-14 | PROBE | spec-undefined — non-numeric id 'abc' | status 200 |
| FR10-DT-01 | MANUAL | pending: red 'Hủy đơn' shown; tap → success → 'Đã hủy' (FR-10/20/21) | (manual) |
| FR10-DT-02 | MANUAL | confirmed: cancel button shown; tap → canceled (FR-10/20) | (manual) |
| FR10-DT-03 | MANUAL | Empty history: 'Bạn chưa có đơn hàng nào.' (FR-24) | (manual) |
| FR10-DT-04 | MANUAL | shipping: NO cancel button (L1, FR-20) | (manual) |
| FR10-DT-05 | MANUAL | delivered: NO cancel button (L1, final) | (manual) |
| FR10-DT-06 | MANUAL | canceled: NO cancel button (L1, final) | (manual) |
| FR10-DT-07 | FAIL | Reject 4xx — user cannot cancel a shipping order via API (L2, FR-10) | status 200 |
| FR10-DT-08 | PASS | Reject — cancel delivered (L2, final) | status 400 |
| FR10-DT-09 | PASS | Reject — cancel canceled (L2, final) | status 400 |
| FR10-DT-10 | PASS | Reject — cannot cancel another user's order (FR-11) | status 404 |
| FR10-DT-11 | MANUAL | L1↔L2 consistency at shipping (button hidden AND API rejects) | (manual) |
| FR10-DT-12 | MANUAL | VN status labels for all 5 states (FR-21) | (manual) |
| FR10-DT-13 | MANUAL | Offline cancel: error Alert, order unchanged, no crash | (manual) |
| FR10-DT-14 | PROBE | spec-ambiguous — any device path to cancel a shipping order? | status 200 |
| FR10-BVA-01 | MANUAL | pending (LB−1): cancel button shown (L1) | (manual) |
| FR10-BVA-02 | PASS | pending (LB−1): PUT /cancel → 200 canceled (L2) | status 200 |
| FR10-BVA-03 | MANUAL | confirmed (LB): cancel button shown (L1) | (manual) |
| FR10-BVA-04 | PASS | confirmed (LB): PUT /cancel → 200 canceled (L2) | status 200 |
| FR10-BVA-05 | MANUAL | shipping (LB+1): cancel button hidden (L1) | (manual) |
| FR10-BVA-06 | FAIL | shipping (LB+1): PUT /cancel → reject 4xx (L2, KEY — masked bug) | status 200 |
| FR10-BVA-07 | MANUAL | delivered (LB+2): cancel button hidden (L1, final) | (manual) |
| FR10-BVA-08 | PASS | delivered (LB+2): PUT /cancel → reject (L2, final) | status 400 |
| FR10-BVA-09 | PASS | delivered terminal: PUT /cancel → reject (B2 on-edge) | status 400 |
| FR10-BVA-10 | PASS | canceled terminal: PUT /cancel → reject (B2 on-edge) | status 400 |

## Manual checklist (run on device / in the browser — not yet executed)

- [ ] **FR05-DT-01** — Product in grid; image alt; price 30.000.000 ₫; exactly one <h1> (R1/R2/R3/R8)  
  _Web UI: search `iPhone 15 Pro Max`. Verify grid item, non-empty img alt, ₫ thousands format, and exactly one <h1> (DevTools → Elements)._
- [ ] **FR05-DT-08** — Loading indicator visible during fetch (R6)  
  _Throttle network (DevTools) and search; confirm a loading state shows._
- [ ] **FR05-DT-09** — `<b>hi</b>` shown as literal text, not bold (R5)  
  _Search `<b>hi</b>`; confirm the term is not rendered as bold HTML._
- [ ] **FR05-DT-10** — No script executes; term escaped (R5/SEC-04)  
  _Search `<script>alert(1)</script>`; confirm no alert fires and text is escaped._
- [ ] **FR05-DT-11** — No JS executes from img onerror (R5)  
  _Search `<img src=x onerror=alert(1)>`; confirm no alert._
- [ ] **FR05-DT-16** — Empty catalog ⇒ empty-state, not a broken grid (R1/R7)  
  _Delete all products (admin), open the listing; confirm a friendly empty state._
- [ ] **FR05-DT-17** — Empty-state message must not echo the raw term as HTML (R5/R7)  
  _Search `<script>alert(1)</script>`; read the 'no results' message; confirm no script and escaped text._
- [ ] **FR09-DT-05** — Reject — inactive coupon (C1 is_active=1)  
  _Seed a coupon with is_active=0 in the DB, then apply it; expect rejection. (No API to set is_active.)_
- [ ] **FR14-DT-09** — Category name with <script> escaped on display, not executed (SEC-04)  
  _Admin create name `<script>alert(1)</script>`; view anywhere the category renders; confirm escaped, no alert._
- [ ] **FR10-DT-01** — pending: red 'Hủy đơn' shown; tap → success → 'Đã hủy' (FR-10/20/21)  
  _Mobile: on a pending order, confirm red cancel button, tap it, confirm success + label 'Đã hủy'._
- [ ] **FR10-DT-02** — confirmed: cancel button shown; tap → canceled (FR-10/20)  
  _Mobile: drive an order to confirmed (admin), confirm button shown, tap, confirm canceled._
- [ ] **FR10-DT-03** — Empty history: 'Bạn chưa có đơn hàng nào.' (FR-24)  
  _Mobile: log in as a user with no orders; confirm the empty-state message._
- [ ] **FR10-DT-04** — shipping: NO cancel button (L1, FR-20)  
  _Mobile: order in shipping; confirm 'Hủy đơn' button is NOT rendered._
- [ ] **FR10-DT-05** — delivered: NO cancel button (L1, final)  
  _Mobile: order delivered; confirm no cancel button._
- [ ] **FR10-DT-06** — canceled: NO cancel button (L1, final)  
  _Mobile: order canceled; confirm no cancel button._
- [ ] **FR10-DT-11** — L1↔L2 consistency at shipping (button hidden AND API rejects)  
  _Compare FR10-DT-04 (button hidden) with FR10-DT-07 (API reject). Both must hold; hidden button + API accept ⇒ UI masks a server defect._
- [ ] **FR10-DT-12** — VN status labels for all 5 states (FR-21)  
  _Mobile: view one order per state; confirm each shows the correct Vietnamese label, not a raw enum._
- [ ] **FR10-DT-13** — Offline cancel: error Alert, order unchanged, no crash  
  _Mobile: with backend unreachable, tap 'Hủy đơn'; confirm error Alert and no crash._
- [ ] **FR10-BVA-01** — pending (LB−1): cancel button shown (L1)  
  _Mobile: pending order → button shown._
- [ ] **FR10-BVA-03** — confirmed (LB): cancel button shown (L1)  
  _Mobile: confirmed order → button shown._
- [ ] **FR10-BVA-05** — shipping (LB+1): cancel button hidden (L1)  
  _Mobile: shipping order → button hidden._
- [ ] **FR10-BVA-07** — delivered (LB+2): cancel button hidden (L1, final)  
  _Mobile: delivered order → button hidden._

## Probes — adjudicated (spec-undefined / ambiguous)

> **Provisional decisions** (recorded 2026-07-03; the reviewer was away when asked, so these are my
> best-judgment calls against the written spec — override any of them). **Decision legend:**
> **NOT-A-BUG** = spec-compliant / defensible; **SPEC-GAP** = not a code bug, but the spec should
> define it; **CLARIFY** = genuinely ambiguous, raise with the spec owner; **FILED** = promoted to a bug.

| Case | Actual | Question | Decision + rationale |
|------|--------|----------|----------------------|
| FR05-DT-04 | 1 row | case-insensitive search? | **NOT-A-BUG** — case-insensitive matching is reasonable; spec (R4) doesn't forbid it |
| FR05-DT-18 | 0 rows | accent-folding (`ban phim`)? | **SPEC-GAP** — no accent-fold; spec doesn't require it (UX enhancement, not a defect) |
| FR05-BVA-05 | 200, 0 rows | 256-char search cap? | **NOT-A-BUG** — spec sets no search-length cap; handled gracefully |
| FR09-DT-14 | 404 | code case-sensitivity (`save10`)? | **FILED → BUG-12** — API-layer inconsistency (`WHERE code = ?` is BINARY/case-sensitive); Low |
| FR09-BVA-17 | 400 expired | same-day expiry? | **CLARIFY** — C2 says "before `expired_at`"; date-vs-datetime makes the expiry *day* ambiguous |
| FR09-BVA-21 | 400 | negative total? | **NOT-A-BUG** — rejecting a negative order total is safe/correct |
| FR14-DT-08 | 200 "deleted" | delete non-existent 9999? | **NOT-A-BUG (low note)** — idempotent DELETE; 200 defensible though a 404 would be cleaner |
| FR14-DT-11 | 200 | duplicate name 'Laptop'? | **SPEC-GAP** — FR-14 states no uniqueness rule |
| FR14-DT-12 | 200 | delete category with products? | **FILED → BUG-09** (orphans products; FR-15 invariant) |
| FR14-DT-13 | 200 | numeric-only name '12345'? | **NOT-A-BUG** — spec only requires non-empty; no format rule |
| FR14-BVA-05 | 200 | 255-char name? | **NOT-A-BUG** — no max-length in spec |
| FR14-BVA-06 | 200 | 256-char name? | **NOT-A-BUG** — no max-length in spec |
| FR14-BVA-09 | 200 | delete id 0? | **NOT-A-BUG (low note)** — no-op idempotent delete |
| FR14-BVA-10 | 200 | delete id −1? | **NOT-A-BUG (low note)** — no-op idempotent delete |
| FR14-BVA-12 | 200 | delete id past max? | **NOT-A-BUG (low note)** — no-op idempotent delete |
| FR14-BVA-13 | 200 | delete far-above id? | **NOT-A-BUG (low note)** — no-op idempotent delete |
| FR14-BVA-14 | 200 | non-numeric id 'abc'? | **NOT-A-BUG (low note)** — no-op; a 400 would be cleaner |
| FR10-DT-14 | 200 (user path) | admin cancel a shipping order? | **NOT-A-BUG** — reviewer decision: the **diagram is authoritative** (`canceled` only from pending/confirmed), so admin being unable to cancel a `shipping` order is correct. (DT-14 as-run hit the *user* path → that 200 is BUG-07, not an admin action.) |

### Outcome
- **Promoted to bugs:** `FR14-DT-12` → **BUG-09**; `FR09-DT-14` → **BUG-12** (case-sensitive coupon code).
- **Resolved NOT-A-BUG by reviewer:** `FR10-DT-14` admin-cancel-from-`shipping` — the state diagram
  is authoritative, so disallowing `shipping→canceled` is correct.
- **Raise with the spec owner (1 clarification):** `FR09-BVA-17` same-day-expiry semantics (date vs
  datetime).
- **Spec gaps to note (not code bugs):** category name **uniqueness** (`FR14-DT-11`), **max length**
  (`BVA-05/06`), **format** (`DT-13`); search **accent-folding** (`FR05-DT-18`).
- **Low-priority observation (not filed):** invalid/non-existent category delete returns `200
  "Category deleted"` (`FR14-DT-08`, `BVA-09/10/12/13/14`) — idempotent but a 404/400 would be
  cleaner. File only if you want it as a Low bug.
- **Everything else:** NOT-A-BUG (spec-compliant / defensible).

_`FR09-DT-16` note: it PASSED but for the wrong reason — anonymous `VIP100 @300,000` was rejected by
the `>`-min bug (BUG-01), not by the auth check; the anonymous-coupon defect is confirmed by
`FR09-DT-09` (BUG-03), not this case._

## Notes on determinism
- Single clean run, **0 ERRORs**. Backend reseeded on boot; coupon usage/expiry boundaries used throwaway coupons, so no cross-case state coupling.
- All 23 FAILs reproduce the defects predicted in `docs/test-design-report.md` §3 hotspots. No hotspot passed unexpectedly.
