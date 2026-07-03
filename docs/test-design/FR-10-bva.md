# FR-10 (Mobile) — Order Cancellation State Machine — Boundary Value Analysis (BVA)

> **Technique:** BVA = **Step 4 of Domain Testing** (course lecture **CSC13003 — S04**). *A
> program is more likely to fail at a boundary.* FR-10 has **no numeric range**, so BVA is applied
> to the **ordinal state edge** where cancellation permission flips — observed on **mobile** at
> **two layers**: the "Hủy đơn" **button visibility** (L1) and the **server enforcement** (L2).
> The two lecture edge-defects appear as state-machine analogues:
> - **Inequality mis-specified** → a **final state still transitions** (`canceled`/`delivered`
>   cancel accepted).
> - **Boundary value mistyped / off-by-one** → the **cancel-permission edge placed one state too
>   far** (user-cancel allowed through `shipping` instead of stopping at `confirmed`).
>
> **Oracle = `README.md`** (FR-10 + FR-20); **no PASS/FAIL**. Complements `FR-10-domain.md` —
> **edges only** (class reps live there). **Scope:** mobile user self-cancel via
> `PUT /api/orders/:id/cancel`; the button-gate is at App.js:961.

---

## Step 1–2 — Boundaries & operators

Order the lifecycle `pending(0) → confirmed(1) → shipping(2) → delivered(3)`; `canceled`
absorbing. Two edges matter on mobile:

| # | "Boundary" | Rule / operator (spec) | Layers |
|---|-----------|------------------------|--------|
| B1 | **cancel-permission edge** | FR-20: user-cancel allowed while state `≤ confirmed`; **first forbidden = `shipping`**. `confirmed` (LB) allowed; `shipping` (LB+1) forbidden. | L1 button visibility + L2 API |
| B2 | **terminal-state edge** | FR-10: `delivered`/`canceled` are **final** — never cancelable | L1 button hidden + L2 API reject |

> B1 is the signature edge: `confirmed` (last cancelable) and `shipping` (first forbidden) pin it
> exactly. On mobile the button-visibility line is drawn **between confirmed and shipping**
> (App.js:961) — L1 tests whether the **UI** draws it correctly; L2 tests whether the **server**
> draws the same line (the planted backend defect lives at L2).

---

## Step 3–4 — Boundary cases

### B1 — cancel-permission edge (straddle: pending / confirmed / shipping / delivered), both layers

| ID | Boundary (operator, rule) | State | Layer | Precondition (fixture) | Expected (per spec) | Probes |
|----|---------------------------|-------|-------|------------------------|---------------------|--------|
| BVA-01 | LB−1: `pending` (inside allowed) | pending | L1 | order `pending` | "Hủy đơn" button **shown** (FR-20) | inside allowed (UI) |
| BVA-02 | LB−1 action | pending | L2 | order `pending`, user token | `PUT /cancel` → **200 → canceled** (FR-10) | inside allowed (server) |
| BVA-03 | **LB: `confirmed` (last cancelable)** | confirmed | L1 | order `confirmed` | Button **shown** (FR-20) | LB (allowed, UI) |
| BVA-04 | **LB: `confirmed`** action | confirmed | L2 | order `confirmed`, user token | `PUT /cancel` → **200 → canceled** (FR-10) | LB (server allows) |
| BVA-05 | **LB+1: `shipping` (first forbidden)** | shipping | L1 | order `shipping` | Button **hidden** (FR-20: no user-cancel when shipping) | **just over (UI)** |
| BVA-06 | **LB+1: `shipping`** forced action | shipping | L2 | order `shipping`, user token | `PUT /cancel` → **reject 4xx** (FR-10). *If accepted, the hidden button masked a server bug.* | **just over (server — key)** |
| BVA-07 | LB+2: `delivered` (past edge, also final) | delivered | L1 | order `delivered` | Button **hidden** (final, FR-10) | beyond edge (UI) |
| BVA-08 | LB+2: `delivered` forced action | delivered | L2 | order `delivered`, user token | `PUT /cancel` → **reject** (final, FR-10) | beyond edge (server) |

### B2 — terminal-state edge (server enforcement)

| ID | Boundary (operator, rule) | State | Layer | Precondition | Expected (per spec) | Probes |
|----|---------------------------|-------|-------|--------------|---------------------|--------|
| BVA-09 | on edge: `delivered` final | delivered | L2 | delivered order | `PUT /cancel` → reject — no exit from final (FR-10) | on-edge (dup-guard of BVA-08, terminal framing) |
| BVA-10 | on edge: `canceled` final/already | canceled | L2 | canceled order | `PUT /cancel` → reject — already final (FR-10) | on-edge |

---

## Coverage check (skill checklist)

- [x] Method summary + rationale mapping the two lecture edge-defects to their mobile state-machine analogues.
- [x] B1 straddled at **both layers**: `pending`(LB−1) / `confirmed`(LB) / `shipping`(LB+1) / `delivered`(LB+2), UI **and** API.
- [x] B2 terminal edge (`delivered`, `canceled`) enforced at the server (L2).
- [x] Operator/side stated: cancel allowed while `≤ confirmed`; forbidden from `shipping` onward; finals never cancelable.
- [x] The L1↔L2 contrast at `shipping` (BVA-05 vs BVA-06) is explicit — the masked-bug edge.
- [x] No duplication with `FR-10-domain.md` (class reps there; edges here).

## Highest-value boundary (mobile FR-10)
**BVA-05 + BVA-06 — the `confirmed → shipping` permission flip.** The app draws the button line
here (App.js:961), so **BVA-05** verifies the UI hides the button at `shipping` (likely correct),
while **BVA-06** forces the API and checks the **server** rejects — the layer where the planted
defect (user-cancel-while-shipping accepted) actually lives. **Passing BVA-05 alone is a false
positive for FR-10; BVA-06 is the case that catches the bug.** `confirmed` (BVA-03/04, allowed)
and `shipping` (BVA-05/06, forbidden) pin the edge exactly.

## Execution notes
Build states via the admin API (mobile can't reach `confirmed`/`shipping`/`delivered`): checkout →
`pending`, then admin `PUT /api/admin/orders/:id/status`; cancel a fresh `pending` order for
`canceled`. For **L1** rows capture a **screenshot** of the order card (button shown/hidden); for
**L2** rows capture the raw `PUT /api/orders/:id/cancel` status + JSON (Postman/cURL) with the
**user** token. `API_URL` → LAN IP; `node database.js` resets between destructive runs. Record
Actual/Status/Evidence in the shared results table (workflow §6).
