# FR-10 — Order State Machine — Boundary Value Analysis (BVA)

> **Technique:** BVA = **Step 4 of Domain Testing** (course lecture **CSC13003 — S04**). *A
> program is more likely to fail at a boundary.* FR-10 has **no numeric range**, so BVA is applied
> to the two genuine *ordinal* edges of the state machine, where the two lecture edge-defects show
> up as their state-machine analogues:
> - **Inequality mis-specified** → the **wrong side of a terminal-state edge** is treated as
>   transitionable (e.g. an implementation that lets a *final* state still transition — the
>   `canceled→delivered` class).
> - **Boundary value mistyped / off-by-one** → the **actor-permission edge is placed one state
>   too far** (e.g. user-cancel allowed through `shipping` instead of stopping at `confirmed`).
>
> **Oracle = `README.md` FR-10**; **no PASS/FAIL**. Complements `FR-10-domain.md` — **edges only**
> (the full transition matrix and mid-machine transitions live there).

---

## Step 1–2 — Boundaries & operators

Order the lifecycle as a progression: `pending(0) → confirmed(1) → shipping(2) → delivered(3)`,
with `canceled` as an absorbing exit from `pending`/`confirmed`.

| # | "Boundary" | Edge / operator (spec) |
|---|-----------|------------------------|
| B1 | **Terminal-state edge** — the line between *non-final* (may transition) and *final* (`delivered`, `canceled`; may NOT) | Rule: source `∉ {delivered, canceled}` to transition. On/over the edge (source **is** final) ⇒ **reject**. |
| B2 | **User-cancel permission edge** along the progression | Rule: user self-cancel allowed while state `≤ confirmed`; **first forbidden state = `shipping`**. The edge sits **between `confirmed` (LB-side, allowed)** and `shipping` (just over, forbidden). |
| B3 | **Forward-progress adjacency edge** | Only the *adjacent* forward step is legal (`n → n+1`); a step of size ≥2 (skip-ahead) or ≤0 (backward/self) is over the edge ⇒ reject. |

---

## Step 3–4 — Boundary cases

### B1 — terminal-state edge (just-before-final vs on/over-final)

| ID | Boundary b (rule) | State tested | Actor | Precondition | Expected (per spec) | Probes |
|----|-------------------|--------------|-------|--------------|---------------------|--------|
| BVA-01 | last non-final source (shipping) → its one legal exit | `shipping`→`delivered` | admin | order `shipping` | **Accept** — legal forward, still pre-final | LB (just inside) |
| BVA-02 | on the edge: source = `delivered` (final) | `delivered`→`shipping` | admin | order `delivered` | **Reject** — final, no exit (FR-10) | on-edge (final) |
| BVA-03 | on the edge: source = `delivered` (final), other target | `delivered`→`canceled` | admin | order `delivered` | Reject — final (FR-10) | on-edge alt target |
| BVA-04 | on the edge: source = `canceled` (final) | `canceled`→`delivered` | admin | order `canceled` | **Reject** — final, no exit (FR-10) | **on-edge — key defect probe** |
| BVA-05 | over the edge: source = `canceled` (final), other target | `canceled`→`confirmed` | admin | order `canceled` | Reject — final (FR-10) | on-edge alt target |

### B2 — user-cancel permission edge (confirmed = last allowed; shipping = first forbidden)

| ID | Boundary b (rule) | State tested | Actor | Precondition | Expected (per spec) | Probes |
|----|-------------------|--------------|-------|--------------|---------------------|--------|
| BVA-06 | LB−1: `pending` (well inside allowed) | user `/cancel` `pending` | user (owner) | order `pending` | **Accept** → canceled (FR-10) | inside allowed |
| BVA-07 | **LB: `confirmed` — last user-cancelable** | user `/cancel` `confirmed` | user (owner) | order `confirmed` | **Accept** → canceled (FR-10) | LB (on, allowed) |
| BVA-08 | **LB+1: `shipping` — first user-forbidden** | user `/cancel` `shipping` | user (owner) | order `shipping` | **Reject** — user may not self-cancel when shipping; admin only (FR-10) | **just over edge — key defect probe** |
| BVA-09 | LB+2: `delivered` (past edge, also final) | user `/cancel` `delivered` | user (owner) | order `delivered` | Reject — forbidden + final (FR-10) | beyond edge |
| BVA-10 | admin at the same edge (contrast) | admin acts on `shipping` | admin | order `shipping` | Admin may act (→`delivered` legal; cancel = `spec-ambiguous`, see domain DT-14) | edge differs by actor |

### B3 — forward-progress adjacency edge (step size)

| ID | Boundary b (rule) | Transition tested | Actor | Precondition | Expected (per spec) | Probes |
|----|-------------------|-------------------|-------|--------------|---------------------|--------|
| BVA-11 | step = +1 (adjacent, legal) | `pending`→`confirmed` | admin | order `pending` | **Accept** (FR-10) | on legal step |
| BVA-12 | step = +2 (skip-ahead, just over) | `pending`→`shipping` | admin | order `pending` | **Reject** — not adjacent (FR-10) | +1 over legal step |
| BVA-13 | step = +3 (max skip) | `pending`→`delivered` | admin | order `pending` | Reject — skip-ahead (FR-10) | extreme skip |
| BVA-14 | step = 0 (self-loop) | `confirmed`→`confirmed` | admin | order `confirmed` | Reject/no-op — not a legal transition (`spec-undefined` on no-op vs error) | zero step |
| BVA-15 | step = −1 (backward, just under) | `shipping`→`confirmed` | admin | order `shipping` | Reject — backward (FR-10) | below legal step |

---

## Coverage check (skill checklist)

- [x] Method summary + rationale mapping the two lecture edge-defects to their state-machine analogues.
- [x] B1 straddles the terminal-state edge (last-non-final accept vs on-final reject, both final states).
- [x] B2 straddles the actor-permission edge with LB−1/LB/LB+1/LB+2 (`pending`/`confirmed`/`shipping`/`delivered`) + admin contrast.
- [x] B3 straddles the adjacency edge with step −1/0/+1/+2/+3.
- [x] Operator/side stated per boundary; `spec-undefined`/`spec-ambiguous` where the spec is silent (BVA-10/14).
- [x] No duplication with `FR-10-domain.md` (matrix + mid-machine transitions there; edges here).

## Highest-value boundaries in FR-10
1. **BVA-04 — `canceled → delivered`** (on the terminal-state edge). A final state must reject all
   exits; an implementation that carves out this one transition fails **only** here — the
   state-machine form of an "inequality mis-specified" defect.
2. **BVA-08 — user cancels a `shipping` order** (one state past the permission edge). Spec forbids
   user self-cancel from `shipping`; an off-by-one that extends user-cancel one state too far
   fails **only** at this value. `confirmed` (BVA-07, allowed) and `shipping` (BVA-08, forbidden)
   together pin the edge exactly.

## Execution notes
Build each source-state fixture as in `FR-10-domain.md` (checkout → drive via admin status
updates; cancel a pending order to reach `canceled`). Use the **owner** token for B2 user cases
and the admin token for B1/B3. `node database.js` between destructive runs. Capture each
status/JSON; record Actual/Status/Evidence in the shared results table (workflow §6).
