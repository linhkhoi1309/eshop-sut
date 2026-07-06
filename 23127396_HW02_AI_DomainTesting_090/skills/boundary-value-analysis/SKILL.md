---
name: boundary-value-analysis
description: >-
  Design edge-case test cases with Boundary Value Analysis (BVA) for features
  that have ordered numeric, string-length, count, or date inputs. Use after (or
  alongside) equivalence-class partitioning to catch off-by-one / min / max /
  threshold defects (e.g., ">" used where ">=" was specified, or a mistyped
  boundary value). Triggers: "boundary value analysis", "BVA", "edge cases",
  "off-by-one", "min/max testing", "threshold / >= boundary". Pairs with the
  domain-testing skill.
---

# Boundary Value Analysis (BVA)

BVA is **Step 4 of Domain Testing** (course lecture CSC13003 — S04). *A program is more likely
to fail at a boundary.* For each ordered equivalence-class partition, the **best representatives
are the boundary values**, so we test values straddling every edge instead of only mid-range
values.

## Why boundaries (lecture rationale)
Two classic edge defects that only boundary tests reliably catch:
- **Inequality mis-specified** — e.g. `INPUT <= 25` coded where `< 25` was intended (or `>` used
  where `>=` was specified). Detectable **only at the boundary**.
- **Boundary value mistyped** — e.g. `< 52` typed for `< 25` (transposition). Detectable at the
  boundary and at any other value handled incorrectly.
A boundary value (test at exactly *b*) catches **all** such errors; a non-boundary "nominal"
value may catch **none**.

## Guardrails (read first)

1. **The written spec is the oracle — never the code, never this AI.** For each boundary,
   read the spec to determine whether the edge value itself is *inside* or *outside* the valid
   class (inclusive vs exclusive `< <= > >=`), then set the Expected result accordingly.
2. **This skill never rules PASS/FAIL** — it designs cases; a human executes and decides.
3. State the boundary rule (the operator) you inferred from the spec, so a reviewer can check it.
4. Needs concrete numbers. If the min/max/length limits aren't given, ask for them (or read
   them from the spec / seed data) before generating cases.

## Method — 4 steps

### Step 1 — Find the boundaries
From the domain-testing partitions, take each ordered/length/count/date class and extract every
boundary *b*: range endpoints (**Lower Boundary LB**, **Upper Boundary UB**), thresholds
(e.g., `min_order_amount`, `max_uses_per_user`), string-length limits, and date cut-offs.

### Step 2 — Determine inclusive vs exclusive
For each *b*, read the spec's operator (`< <= > >=`) and record which side of *b* is valid. This
sets the Expected result **at exactly b** — and is usually where the bug hides.

### Step 3 — Generate the boundary set (up to ~9 values per partition)
Per the lecture's model, a single ordered partition yields at most ~9 test values:
- **Lower edge:** `LB−1` (just outside), `LB` (on), `LB+1` (just inside).
- **Upper edge:** `UB−1` (just inside), `UB` (on), `UB+1` (just outside).
- **Extremes:** the **smallest** and **largest** values the UI/type allows (the min/max
  possible inputs), to probe overflow/robustness.
- **Nominal:** one typical in-range value (sanity / robust-BVA anchor).

Specializations:
- **Single boundary (one edge only):** the 3-value set `{b−1, b, b+1}`.
- **Strings/collections:** length **0, 1, max−1, max, max+1** (+ empty vs whitespace).
- **Dates:** the day **before**, the day **of**, and the day **after** the cut-off.
- Include **0, negative, and non-numeric** where the spec constrains sign/type.

### Step 4 — Tabulate
Every row names the boundary it probes, the operator, and the spec-expected result at that point.

```markdown
| ID | Variable | Boundary b (operator, rule) | Value tested | Precondition | Expected (per spec) | Probes |
|----|----------|-----------------------------|--------------|--------------|---------------------|--------|
| BVA-01 | total_amount | 300000 (>=, C3 "total >= min") | 299999 | SAVE10 | Coupon rejected (below min) | LB−1 |
| BVA-02 | total_amount | 300000 (>=, C3)            | 300000 | SAVE10 | Coupon APPLIES; discount 30,000 | LB (inclusive) |
| BVA-03 | total_amount | 300000 (>=, C3)            | 300001 | SAVE10 | Coupon applies | LB+1 |
```

## Prompt scaffold (when delegating generation to an LLM)

```
The ONLY source of correct behavior is this specification excerpt (not any code):
"""
<paste exact spec / FR text, including comparison operators and limits>
"""
Concrete limits / seed values: <paste>.
Do boundary value analysis (CSC13003 S04, step 4 of domain testing):
 1) list every boundary b (LB, UB, thresholds, length limits, date cut-offs);
 2) for each, state the operator and inclusive vs exclusive per the spec;
 3) generate LB-1/LB/LB+1 and UB-1/UB/UB+1, plus smallest/largest allowed values and a
    nominal (length {0,1,max-1,max,max+1} for strings; day-before/of/after for dates;
    plus 0/negative/non-numeric where sign/type is constrained);
 4) output [ID | Variable | Boundary(operator,rule) | Value | Precondition | Expected(spec) | Probes].
Set Expected AT exactly b from the spec operator, not from any implementation.
Do not assign PASS/FAIL.
```

## Worked reference (EShop FR-09, the critical `>=` boundary)

Spec condition C3: coupon applies when `total >= min_order_amount`. Boundary *b = 300,000*
(SAVE10). The three-value set `{299,999 → reject, 300,000 → APPLY, 300,001 → apply}` isolates the
inclusive edge. The `b` case (exactly the minimum) is the single highest-value boundary test,
because an implementation using `>` instead of `>=` (the "inequality mis-specified" defect) fails
**only** at that point. Repeat for every coupon's own `min_order_amount`, for `max_uses_per_user`
(uses = max−1 / max / max+1), and for `expired_at` (day before / of / after).

## Strengths & blind spots (lecture)
- **Strengths:** highest-probability errors with a small test set; intuitive; extends well to
  multi-variable situations.
- **Blind spots:** errors **not** at boundaries or obvious special cases; actual domains are
  often unknowable — pair with exploratory testing.

## Output checklist

- [ ] Method summary (3–5 lines) + boundary rationale (mis-specified inequality / mistyped value).
- [ ] Each boundary has LB−1/LB/LB+1 (and UB−1/UB/UB+1 when a second edge exists) + extremes + nominal.
- [ ] Operator + inclusive/exclusive stated per boundary and reflected in Expected.
- [ ] String-length, date, and 0/negative/non-numeric boundaries covered where applicable.
- [ ] Every Expected cites the spec operator/rule; none inferred from code.
- [ ] Complements the `domain-testing` class reps (no duplication of mid-range cases).
