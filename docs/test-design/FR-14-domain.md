# FR-14 — Category Management (CRUD) — Domain Testing (Equivalence Class Partitioning)

> **Technique:** Domain Testing per course lecture **CSC13003 — S04**. Partition each variable's
> domain into valid/invalid equivalence classes and test one **best representative** per class.
> **4-step approach:** (1) Input & Output variables → (2) equivalence classes → (3) best
> representative → (4) ordered/length fields → boundaries (`FR-14-bva.md`). **Coverage (Step 3):**
> *valid* classes **combined**; each *invalid* class **isolated**. **Oracle = `README.md` FR-14 +
> FR-12/SEC-03**; `spec-undefined` where silent; **no PASS/FAIL** (execution decides).
>
> **Endpoints:** `GET /api/categories` (list), `POST /api/categories`, `PUT /api/categories/:id`,
> `DELETE /api/categories/:id`.
> **Spec:** FR-14 — Admin can **Add / View / Delete**; **category name is required, must not be
> empty**. FR-12 & SEC-03 — the **write** endpoints (`POST/PUT/DELETE /api/categories`) must
> require **a valid JWT AND `role='admin'`** (not merely a token's existence).
> **Seed:** categories `1 Điện thoại`, `2 Laptop`, `3 Phụ kiện`.

---

## Step 1 — Input & Output variables

| Kind | Variable | Domain |
|------|----------|--------|
| **Input** | `name` (body) | any string: normal / empty / whitespace / long / injection / diacritics / numeric / duplicate |
| **Input** | category `id` (path, for PUT/DELETE) | existing / non-existent / 0 / negative / non-numeric |
| **State/Input** | **actor auth** | no token / valid **user** (non-admin) token / valid **admin** token |
| **State** | referential: category has products | yes / no (delete-integrity) |
| **Output** | success — created | `{message:"Category created", id}` |
| **Output** | success — deleted | `{message:"Category deleted"}` |
| **Output** | success — list | array of `{id,name}` |
| **Output** | error — name required | rejection (empty name) per FR-14 |
| **Output** | error — unauthenticated | 401 (no valid token) |
| **Output** | error — forbidden (not admin) | 403 (valid token, `role≠admin`) per SEC-03 |

> The **actor auth** variable is a *set handled differently* (lecture guideline) → one class per
> member: no-token, user-token, admin-token.

---

## Step 2 — Complete set of equivalence classes

| EC | Variable (In/Out) | Condition | Class (valid/invalid) | Representative |
|----|-------------------|-----------|-----------------------|----------------|
| EC1 | name (in) | required non-empty (FR-14) | valid: normal name | `Máy tính bảng` |
| EC2 | name (in) | charset | valid: Vietnamese diacritics | `Đồng hồ thông minh` |
| EC3 | name (in) | required (FR-14) | **invalid: empty `""`** | `` |
| EC4 | name (in) | required non-empty | **invalid: whitespace-only** | `"   "` |
| EC5 | name (in) | uniqueness | probe: duplicate name | `Laptop` → **spec-undefined** (no uniqueness rule stated) |
| EC6 | name (in) | length (no max stated) | probe: very long (>255) | 300-char string → **spec-undefined** |
| EC7 | name (in) | safe render (SEC-04) | invalid/adversarial: HTML/script | `<script>alert(1)</script>` |
| EC8 | name (in) | param query (SEC-05) | invalid/adversarial: SQL meta | `'); DROP TABLE categories;--` |
| EC9 | name (in) | type | probe: numeric-only | `12345` → **spec-undefined** |
| EC10 | actor (state) | FR-12/SEC-03 | valid: **admin** token | admin@eshop.com |
| EC11 | actor (state) | FR-12/SEC-03 | **invalid: user (non-admin) token** | test@eshop.com |
| EC12 | actor (state) | SEC-02/FR-12 | **invalid: no token** | (missing Authorization) |
| EC13 | id (in, PUT/DEL) | exists | valid: existing id | 3 |
| EC14 | id (in, PUT/DEL) | exists | invalid: non-existent id | 9999 |
| EC15 | referential (state) | delete integrity | probe: category **has products** | id 1 (has iPhone/Samsung) → **spec-undefined** |
| EC-O1 | list (out) | GET is public? | success: returns array | — |

---

## Step 3 — Selected test cases

### Valid classes — combined (few dense positive tests)

| ID | Classes (EC) | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|--------------|---------------|--------------|--------------------------|-----------|
| DT-01 | EC1,EC2,EC10,EC-O1 | admin POST name=`Đồng hồ thông minh`; then GET list | admin token | Created (201/`id`); appears in GET list (FR-14 Add+View) | packs valid name + diacritics + admin + list |
| DT-02 | EC10,EC13 (valid delete) | admin DELETE category id=3 | admin token; id 3 exists | Deleted; no longer in list (FR-14 Delete) | valid delete path |

### Invalid classes — one isolated per test

| ID | Class (EC) | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|-----------|---------------|--------------|--------------------------|-----------|
| DT-03 | EC3 (only) | admin POST name=`` | admin token | **Reject** — name required, not empty (FR-14) | empty-name isolated (key defect) |
| DT-04 | EC4 (only) | admin POST name=`"   "` | admin token | Reject — whitespace-only is empty (FR-14) | whitespace isolated |
| DT-05 | EC11 (only) | **user** token POST name=`Hợp lệ` | valid non-admin token | **Reject 403** — needs `role='admin'` (FR-12/SEC-03) | non-admin isolated (key defect) |
| DT-06 | EC12 (only) | no-token POST name=`Hợp lệ` | no Authorization | Reject 401 — token required (SEC-02/FR-12) | unauthenticated isolated |
| DT-07 | EC11 (only, DELETE) | **user** token DELETE id=2 | valid non-admin token | Reject 403 — admin-only (FR-12/SEC-03) | non-admin write on delete |
| DT-08 | EC14 (only) | admin DELETE id=9999 | admin token | Reject/no-op — category not found (FR-14) | non-existent id isolated |
| DT-09 | EC7 (only) | admin POST name=`<script>alert(1)</script>`; view where rendered | admin token | Stored/escaped; **not** executed as HTML on display (SEC-04) | XSS isolated |
| DT-10 | EC8 (only) | admin POST name=`'); DROP TABLE categories;--` | admin token; fresh DB | Table intact; treated as literal (SEC-05) | SQLi isolated |

### Probe cases (spec silent → `spec-undefined`, still worth running)

| ID | Class (EC) | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|-----------|---------------|--------------|--------------------------|-----------|
| DT-11 | EC5 | admin POST name=`Laptop` (dup) | admin token; `Laptop` exists | `spec-undefined` — no uniqueness rule; probe dup handling | uniqueness probe |
| DT-12 | EC15 | admin DELETE id=1 (has products) | admin token; id 1 has products | `spec-undefined` — probe orphaned-product / integrity behavior | referential-integrity probe |
| DT-13 | EC9 | admin POST name=`12345` | admin token | `spec-undefined` — probe numeric-only name | type probe |

### Interaction cases (name × actor role)

| ID | Interaction | Input / steps | Precondition | Expected (per spec rule) | Rationale |
|----|-------------|---------------|--------------|--------------------------|-----------|
| DT-14 | EC3 × EC11 (empty name **and** non-admin) | user token POST name=`` | valid non-admin token | Reject — **authorization checked first** (403), independent of name (FR-12/SEC-03) | isolates whether auth gate precedes validation |

---

## Coverage check (skill checklist)

- [x] 4-step approach named; method summary present.
- [x] **Output** classes partitioned (created/deleted/list + 3 distinct error outputs).
- [x] Complete partition table (EC1…EC15 + output) precedes selected cases.
- [x] Valid classes **combined** (DT-01/02); each invalid class **isolated** (DT-03…10).
- [x] Adversarial (EC7/8) + **auth-state matrix** (EC10/11/12) present — the SEC-03 defect surface.
- [x] Interaction case DT-14 (name × role); unknowns marked `spec-undefined` (EC5/6/9/15).
- [x] Ordered/length fields (`name` length, `id`) handed to **`FR-14-bva.md`**.

## Execution notes (design-only file)
Obtain two tokens up front: admin (`admin@eshop.com/Admin123!`) and user
(`test@eshop.com/Test1234!`) via `POST /api/login`. `node database.js` before DT-10 and before
re-running delete cases. **DT-05/07 (non-admin write) and DT-03/04 (empty name) are the two
highest-risk classes** — the SUT is known to under-enforce both. Capture each JSON/status;
record Actual/Status/Evidence in the shared results table (workflow §6).
