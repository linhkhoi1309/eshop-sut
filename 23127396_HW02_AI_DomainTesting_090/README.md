# HW02 — Domain Testing & Boundary Value Analysis (with AI)

**Student ID:** 23127396 · **Student Name:** Luong Linh Khoi · **Group:** 06 · **SUT:** EShop (deliberately-buggy teaching system)
**Techniques:** Domain Testing (Equivalence Class Partitioning) + Boundary Value Analysis
**Oracle:** `README.md` (system spec) — not the implementation.

**Features tested (mapped to the grading template):**
- **Feature A** — FR-05 Product listing & search
- **Feature B** — FR-09 Discount coupons
- **Feature C** — FR-14 Category management (CRUD)
- **Feature D** — FR-10 Order cancellation state machine (**Mobile**)
- **Agent Skills** — `domain-testing`, `boundary-value-analysis` (+ `generate-test-script`, `run-tests-and-report`)

---

## Self-Assessment

| No. | Criteria | Grade | Self-Assessed Grade |
|-----|----------|:-----:|:-------------------:|
| 1 | Feature A — FR-05 Product listing & search (Domain + Boundary) | 25 | 23 |
| 2 | Feature B — FR-09 Discount coupons (Domain + Boundary) | 25 | 23 |
| 3 | Feature C — FR-14 Category management (Domain + Boundary) | 25 | 23 |
| 4 | Feature D — FR-10 Order cancellation (Mobile, Domain + Boundary) | 15 | 13 |
| 5 | Agent Skills | 10 | 8 |
|   | **Total** | **100** | **90** |

---

## Test Summary Report

### Features
- **Features tested:** **4** (FR-05, FR-09, FR-14, FR-10-Mobile) + the Agent-Skills deliverable.
- Each feature: a **Domain Testing** design and a **Boundary Value Analysis** design (spec-anchored).

### Test cases

| Metric | Count |
|--------|------:|
| **Designed** | **129** (124 formal design cases + 5 supplemental gap cases) |
| **Executed** | 128 |
| **Passed** (behaves per spec) | 77 |
| **Failed** (spec violation → bug evidence) | 33 |
| **Not yet executed** | 1 |
| Recorded as *probe* (spec-undefined / ambiguous, no pass–fail verdict) | 18 |

> `Executed (128) = Passed (77) + Failed (33) + Probe (18)`; `+ Not executed (1) = Designed (129)`.
> Automated cases run via `tests/runner.mjs` (0 errors); UI/mobile cases verified by browser +
> source inspection; probes recorded for human adjudication. The 1 not-executed case is
> `FR09-DT-05` (inactive coupon) — it needs a DB-seeded `is_active=0` coupon (no API to create one).

**By feature (designed cases):**

| Feature | Domain | BVA | Supplemental | Total | Bugs |
|---------|:------:|:---:|:------------:|:-----:|:----:|
| FR-05 (Feature A) | 18 | 15 | — | 33 | 7 |
| FR-09 (Feature B) | 17 | 22 | — | 39 | 4 |
| FR-14 (Feature C) | 14 | 14 | 1 | 29 | 3 |
| FR-10 Mobile (Feature D) | 14 | 10 | 4 | 28 | 3 |
| **Total** | **63** | **61** | **5** | **129** | **17** |

### Bugs

- **Bugs found & reported:** **17** — all filed as GitHub Issues with reproduction steps and evidence.

| Severity | Count | Bugs |
|----------|:-----:|------|
| Critical | 2 | BUG-04 (SQL injection), BUG-10 (reflected XSS) |
| High | 7 | BUG-01, BUG-02, BUG-03, BUG-06, BUG-07, BUG-08, BUG-13 |
| Medium | 2 | BUG-05, BUG-09 |
| Low | 6 | BUG-11, BUG-12, BUG-14, BUG-15, BUG-16, BUG-17 |
| **Total** | **17** | |

GitHub Issues: <https://github.com/linhkhoi1309/eshop-sut/issues> (#1–#13, #15–#18).
Full detail + screenshots in `bug-report.md` / `bug-report.pdf` and `evidence/bug-01…17.png`.

---

## Deliverables in this folder

| File | Contents |
|------|----------|
| `README.md` | This self-assessment + test summary |
| `bug-report.md` / `.pdf` | 17 bug reports (spec ref, steps, expected/actual, embedded evidence) |
| `evidence/bug-01…17.png` | Screenshot evidence, one per bug |
| `ai-critique.md` / `.pdf` | Critique of AI collaboration |
| `ai-audit-report.md` / `.pdf` | AI usage audit |

## GitHub Repo link

https://github.com/linhkhoi1309/eshop-sut

## Video Demo link

https://drive.google.com/file/d/1Yk3dBWoitkORCjHKg7pZC2JXlmW4qseI/view?usp=sharing