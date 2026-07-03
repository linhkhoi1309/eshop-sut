# FR-10 (Mobile) — Order Cancellation State Machine — Domain Testing (Equivalence Class Partitioning)

> **Technique:** Domain Testing per course lecture **CSC13003 — S04**, applied as
> **state-transition testing** on the **mobile platform**. The "input" is the pair **(order
> current state, cancel action)**; two inputs share an equivalence class iff the spec expects the
> **same result**. **4-step approach:** (1) Input & Output variables → (2) equivalence classes
> (valid + invalid) → (3) best representative → (4) ordered/state fields → boundaries
> (`FR-10-bva.md`). **Coverage (Step 3):** valid classes **combined**; each invalid class
> **isolated**. **Oracle = `README.md`**; `spec-undefined`/`spec-ambiguous` where silent; **no
> PASS/FAIL** (execution decides).
>
> **Platform scope.** The React Native app (`frontend-mobile/App.js`) exposes **only the user
> self-cancel** slice of FR-10 — there is **no admin panel on the device**, so the admin forward
> transitions (`pending→confirmed→shipping→delivered`) and admin-cancel are **fixtures built via
> the admin API**, not mobile actions. Cancel action: `PUT /api/orders/:id/cancel` with the user
> JWT.

**Spec anchors (the oracle):**
- **FR-10** — 5 states `pending, confirmed, shipping, delivered, canceled`; `delivered` and
  `canceled` are **FINAL** (no exit); **when `shipping`, the User may NOT self-cancel — admin only**.
- **FR-20** — mobile "Hủy đơn hàng … chỉ được hủy khi `pending` hoặc `confirmed`".
- **FR-11** — a user sees/acts on **only their own** orders.
- **FR-21** — Vietnamese status labels; danger/cancel actions are **red**.
- **FR-24** — empty order history shows a friendly empty state.

> **Grounding (not the oracle):** `cancelOrder()` → `PUT /api/orders/:id/cancel` (App.js:312); the
> **"Hủy đơn" button renders only when `status ∈ {pending, confirmed}`** (App.js:961);
> `statusLabel()` maps the 5 states to Vietnamese (App.js:331).

---

## The two-layer principle (why mobile FR-10 needs UI *and* API cases)

FR-10 must be enforced by the **server**; the mobile button-gate is only a UX convenience. Since
the app *hides* the "Hủy đơn" button for `shipping`/`delivered`/`canceled`, a test looking **only
at the UI** sees "cannot cancel" and wrongly concludes FR-10 is met — while the backend
`PUT /cancel` may still accept an illegal cancel. **Every forbidden state therefore gets two
classes: (L1) UI — button hidden; (L2) API — direct call rejected.** L1 passing does not imply L2
passes; the UI gate can *mask* the server defect.

---

## Step 1 — Input & Output variables

| Kind | Variable | Domain |
|------|----------|--------|
| **Input (state)** | order `status` | pending / confirmed / shipping / delivered / canceled |
| **Input (action)** | cancel | tap "Hủy đơn" (L1 context) / direct `PUT /cancel` (L2) |
| **Input (identity)** | order ownership | own order / another user's order (API only) |
| **Output — UI** | "Hủy đơn" button | shown / hidden |
| **Output — UI** | status label | Vietnamese text (`statusLabel`) |
| **Output — UI** | post-action feedback | success `Alert` + list refresh / error `Alert` |
| **Output — UI** | empty history | "Bạn chưa có đơn hàng nào." |
| **Output — API** | cancel result | 200 → `canceled` / 4xx rejection (+ error message) |

---

## Step 2 — Complete set of equivalence classes

| EC | Variable (In/Out) | Condition | Class (valid/invalid) | Representative |
|----|-------------------|-----------|-----------------------|----------------|
| EC1 | status × button (UI/L1) | FR-20 cancelable | valid: `pending` → button **shown** | order pending |
| EC2 | status × button (UI/L1) | FR-20 cancelable | valid: `confirmed` → button **shown** | order confirmed |
| EC3 | status × button (UI/L1) | FR-20/FR-10 not user-cancelable | **invalid**: `shipping` → button **hidden** | order shipping |
| EC4 | status × button (UI/L1) | FR-10 final | **invalid**: `delivered` → button **hidden** | order delivered |
| EC5 | status × button (UI/L1) | FR-10 final | **invalid**: `canceled` → button **hidden** | order canceled |
| EC6 | cancel action (L2) | FR-10 valid transition | valid: cancel `pending` → `canceled` | user token, pending |
| EC7 | cancel action (L2) | FR-10 valid transition | valid: cancel `confirmed` → `canceled` | user token, confirmed |
| EC8 | cancel action (L2) | FR-10 user-forbidden when shipping | **invalid**: force-cancel `shipping` via API | user token, shipping |
| EC9 | cancel action (L2) | FR-10 final | **invalid**: force-cancel `delivered` via API | user token, delivered |
| EC10 | cancel action (L2) | FR-10 final | **invalid**: force-cancel `canceled` via API | user token, canceled |
| EC11 | ownership (L2) | FR-11 own-only | **invalid**: cancel another user's order | 2nd user's order id |
| EC12 | status label (UI) | FR-21 Vietnamese | valid: each state → correct VN label | 5 states |
| EC13 | empty history (UI) | FR-24 empty state | valid: no orders → friendly message | new account |
| EC14 | button style (UI) | FR-21 danger = red | valid: cancel button is red | red button |
| EC15 | action feedback (UI) | robustness | **invalid**: backend unreachable on tap | offline |
| EC-O1 | success (out) | after valid cancel | success `Alert`; status shows `Đã hủy`; list refreshed | — |
| EC-O2 | error (out) | after rejected/failed cancel | error `Alert` with backend/failure message | — |

---

## Step 3 — Selected test cases

### Valid classes — combined (UI happy paths)

| ID | Classes (EC) | Steps (mobile) | Precondition (fixture) | Expected (per spec) | Rationale |
|----|--------------|----------------|------------------------|---------------------|-----------|
| DT-01 | EC1,EC6,EC12,EC14,EC-O1 | Profile → order history; on a **pending** order tap "Hủy đơn" | login user; 1 order `pending` | Button shown (red); tap → success Alert; status → **"Đã hủy"** (FR-10/FR-20/FR-21) | packs cancelable + label + style + success |
| DT-02 | EC2,EC7,EC-O1 | On a **confirmed** order tap "Hủy đơn" | order driven to `confirmed` (admin API) | Button shown; tap → success → `canceled` (FR-10/FR-20) | valid cancel from confirmed |
| DT-03 | EC13 | Open order history with no orders | fresh user, 0 orders | "Bạn chưa có đơn hàng nào." empty state (FR-24) | empty-state output |

### Invalid classes — one isolated per test — UI layer (L1: button hidden)

| ID | Class (EC) | Steps (mobile) | Precondition | Expected (per spec) | Rationale |
|----|-----------|----------------|--------------|---------------------|-----------|
| DT-04 | EC3 (only) | Open history on a **shipping** order | order → `shipping` (admin API) | **No "Hủy đơn" button** (FR-20: user can't cancel when shipping) | shipping hidden (L1) |
| DT-05 | EC4 (only) | Open history on a **delivered** order | order → `delivered` | No cancel button (final, FR-10) | delivered hidden (L1) |
| DT-06 | EC5 (only) | Open history on a **canceled** order | order `canceled` | No cancel button (final, FR-10) | canceled hidden (L1) |

### Invalid classes — one isolated per test — server layer (L2: API must reject)

| ID | Class (EC) | Steps (direct API, user token) | Precondition | Expected (per spec) | Rationale |
|----|-----------|--------------------------------|--------------|---------------------|-----------|
| DT-07 | EC8 (only) | `PUT /api/orders/:id/cancel` on a **shipping** order | shipping order owned by user | **Reject (4xx)** — user may not cancel when shipping (FR-10). *UI hides the button; the server must still reject.* | **key: UI gate must not mask server** |
| DT-08 | EC9 (only) | `PUT /cancel` on a **delivered** order | delivered order | Reject — final (FR-10) | final enforcement (L2) |
| DT-09 | EC10 (only) | `PUT /cancel` on a **canceled** order | canceled order | Reject — final/already (FR-10) | final enforcement (L2) |
| DT-10 | EC11 (only) | `PUT /cancel` with **user A** token on **user B's** pending order | 2nd user owns the order | Reject — act on own orders only (FR-11) | ownership (L2) |

### Interaction / robustness / ambiguity

| ID | Class (EC) | Steps | Precondition | Expected (per spec) | Rationale |
|----|-----------|-------|--------------|---------------------|-----------|
| DT-11 | EC3 × EC8 (L1 vs L2 at shipping) | Compare DT-04 (button hidden) with DT-07 (API reject) | shipping order | **Both** must hold; button hidden **but** API accepts ⇒ UI masking an FR-10 server defect | exposes the two-layer gap |
| DT-12 | EC12 (all states) | Read the status label for each of the 5 states | one order per state | Each shows the correct Vietnamese label (FR-21); no raw enum shown | statusLabel coverage |
| DT-13 | EC15,EC-O2 | Tap "Hủy đơn" with backend unreachable | pending order; backend down | Error `Alert`; order unchanged; no crash (robustness) | failure handling |
| DT-14 | spec-ambiguous | On the device, is there ANY path for a user to cancel a `shipping` order? | shipping order | `spec-ambiguous` — FR-10 text says "only admin may act" when shipping; the diagram omits admin-cancel-from-shipping. Probe & report; mobile has no admin path anyway | resolves diagram/text conflict |

---

## Coverage check (skill checklist)

- [x] 4-step approach named; mobile state-transition framing (user-cancel slice only).
- [x] **Output** classes partitioned (UI button/label/feedback/empty + API result), not only inputs.
- [x] Complete partition table (EC1…EC15 + outputs) precedes selected cases.
- [x] Valid classes **combined** (DT-01/02/03); each invalid class **isolated** (DT-04…10).
- [x] **Two-layer** encoded: every forbidden state has an L1 (UI hidden) and L2 (API reject) case.
- [x] Ownership (FR-11), robustness, and label (FR-21) classes present; interaction DT-11; ambiguity DT-14.
- [x] Ordered state edge (cancelable → not) handed to **`FR-10-bva.md`**.

## Execution notes (mobile, design-only file)
- Set `API_URL` in `App.js` to the dev machine's **LAN IP**; `npx expo start`; use Expo Go /
  emulator; backend on `:3000` reachable from the device network.
- **Order-state fixtures** are built via the admin API (mobile can't): checkout as the user →
  `pending`; `PUT /api/admin/orders/:id/status` (admin token) → `confirmed`/`shipping`/`delivered`;
  cancel a fresh `pending` order → `canceled`.
- Capture **screenshots** of each order-history state (button shown vs hidden) for L1 evidence;
  capture the raw `PUT /cancel` status + JSON (Postman/cURL) for L2 (the device UI won't show it).
- **DT-07 (force-cancel shipping) and DT-11 (L1↔L2 gap) are the highest-risk cases** — the backend
  is known to under-enforce the shipping/final rules that the UI merely hides. `node database.js`
  resets. Record Actual/Status/Evidence in the shared results table (workflow §6).
