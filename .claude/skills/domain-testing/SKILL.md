---
name: domain-testing
description: >-
  Design test cases for a feature using Domain Testing / Equivalence Class
  Partitioning against a written specification. Use when you have a spec (a
  requirement, API contract, or acceptance criteria) and need a systematic set
  of valid/invalid input & output classes with a "best representative" per class
  — before writing boundary cases. Triggers: "domain testing", "equivalence
  class", "equivalence partitioning", "test case design for FR-xx", "what inputs
  should I test". Pairs with the boundary-value-analysis skill.
---

# Domain Testing (Equivalence Class Partitioning)

Method follows the course lecture **CSC13003 — S04 Domain Testing**. Domain testing is a
**stratified sampling strategy**: there are too many possible test cases to run, so we
*partition a domain into sub-domains (equivalence classes) and test using a best representative
value from each sub-domain.* Two inputs are in the **same** class if the spec expects the **same
result** for both — running more than one per class is, by definition, redundant.

## Guardrails (read first)

1. **The written spec is the oracle — never the implementation code, never this AI.**
   If you reason from the code, a planted or accidental bug will look "correct." Anchor every
   *Expected* result to a quoted spec rule.
2. **This skill never rules PASS/FAIL.** It designs cases and states the spec-expected result.
   A human executes them against the real system and decides the verdict.
3. If the spec does not define behavior for an input, label the Expected column
   **`spec-undefined`** rather than guessing.
4. Prefer explicit inputs: if you lack seed data / concrete valid values, ask for them —
   vague inputs produce vague (untestable) cases.

## General Approach — 4 steps (per lecture)

1. **Identify Input & Output variables** (from the spec).
2. **Identify equivalence classes** for each input *and each output* — divide its domain into
   valid and invalid sub-domains.
3. **Find a "best representative"** value for each sub-domain.
4. **Ordered fields → best representatives are boundary values** → hand off to the
   `boundary-value-analysis` skill.

### Step 1 — Identify Input & Output variables
List every **input** variable and — importantly — every **output** the spec promises (the
success result *and* each distinct error/rejection message). Also list **state** variables that
change behavior (auth/login state, existing data, network speed). Example (lecture): "adds 2
numbers" → inputs A, B; outputs SUM, "Invalid Input".

### Step 2 — Identify equivalence classes (valid + invalid)
For each variable, derive classes from its **input/output conditions**. Apply the lecture
guidelines:

| If a condition specifies… | Create… |
|---|---|
| a **range** ("count is 1–999") | **1 valid** class (`1≤count≤999`) + **2 invalid** (`<1`, `>999`) |
| a **set** of values each handled differently (BUS, TRUCK, TAXI…) | **1 valid class per member** + **1 invalid** (a non-member) |
| a **"must be"** situation ("first char must be a letter") | **1 valid** (is a letter) + **1 invalid** (not a letter) |
| any reason elements aren't handled **identically** | **split** the class into smaller classes |

Also add, where the spec has security/format rules: **format**, **empty/null**, **whitespace**,
**case**, **charset (diacritics)**, and **adversarial** classes — injection/markup (`' OR 1=1`,
`<script>…`), oversized input, and **authorization state** (no token / wrong-role token /
right-role token). Tabulate the *complete set of partitions* (EC1, EC2, …) before choosing tests.

### Step 3 — Select test cases from the partitions (lecture coverage rules)
Choose **≥1 test case from every equivalence class**, using these two distinct rules:
- **Valid classes → combine.** Pack as many *valid* classes as possible into each test case,
  until all valid classes are covered (few, dense positive tests).
- **Invalid classes → isolate.** Each test case covers **one and only one** invalid class
  (so a rejection can't mask a second defect). One invalid class per test.

Then add **interaction** cases the spec implies (e.g., discount *type* × order *total* × *login*;
category *name* × *actor role*).

### Step 4 — Ordered fields → boundaries
Mark every ordered/length/count/date class; its "best representatives" are edge values. Do not
enumerate them here — hand the variable to `boundary-value-analysis`.

## Output tables

**(a) Complete set of partitions**
```markdown
| EC | Variable (In/Out) | Condition | Class (valid/invalid) | Representative |
|----|-------------------|-----------|-----------------------|----------------|
| EC1 | A (in) | range −99..99 | valid: −99≤A≤99 | 10 |
| EC2 | A (in) | range | invalid: A<−99 | −102 |
```

**(b) Selected test cases** (valid combined, invalid isolated)
```markdown
| ID | Classes covered (EC) | Input value(s) | Precondition | Expected (per spec rule) | Rationale |
|----|----------------------|----------------|--------------|--------------------------|-----------|
| DT-01 | EC1,EC3,EC-out-SUM | A=10, B=9 | — | SUM = 19 (spec) | packs all valid classes |
| DT-02 | EC2 (only) | A=−102, B=9 | — | "Invalid Input" (spec) | one invalid class isolated |
```

## Prompt scaffold (when delegating generation to an LLM)

```
The ONLY source of correct behavior is this specification excerpt (not any code):
"""
<paste exact spec / FR text>
"""
Known valid values / seed data: <paste, or "none — ask me">.
Do domain testing per CSC13003 S04:
 1) list Input AND Output variables (success output + each distinct error);
 2) for each, give the complete set of equivalence classes (valid + invalid) using the
    range / set / must-be / split guidelines; include format, empty, injection/markup,
    and auth-state classes where the spec has security rules;
 3) select test cases: combine VALID classes into few tests; give each INVALID class its
    OWN test (one invalid per case); add interaction cases the spec implies.
Output table (a) complete partitions and (b) selected cases [ID | ECs | Input | Precondition
| Expected(spec rule) | Rationale]. Never infer behavior from code. Mark undefined
behavior "spec-undefined". Do not assign PASS/FAIL.
```

## Worked reference (EShop FR-14, category name)

Variable `name` → classes: normal / duplicate / **empty `""`** / whitespace-only / >255 chars /
HTML-or-SQL metacharacters / Vietnamese diacritics / numeric-only. Output classes: "created" vs
the rejection message. Interaction with **actor role** (auth-state): no token → reject; valid
*user* token → reject per SEC-03; valid *admin* token → accept. Per Step 3, one *valid* test
packs a good name + admin token; each *invalid* class (empty name, non-admin token, …) gets its
own isolated test — surfacing the empty-name and missing-role defects without one masking another.

## Strengths & blind spots (lecture)
- **Strengths:** finds high-probability errors with few tests; intuitive; extends to
  multi-variable situations.
- **Blind spots:** errors that are **not** at boundaries/special cases; the true domains are
  often unknowable. Cover these with exploratory/adversarial passes.

## Output checklist

- [ ] Method summary (4–6 lines) + the 4-step approach named.
- [ ] **Output** variables partitioned, not only inputs.
- [ ] Complete partition table (EC1…) before selected cases.
- [ ] Valid classes **combined**; every invalid class **isolated** in its own test.
- [ ] Adversarial + auth-state classes where the spec has security/access rules.
- [ ] Interaction cases present; undefined behavior marked `spec-undefined`.
- [ ] Ordered/length/date variables handed to `boundary-value-analysis`.
