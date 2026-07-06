# Manual UI Verification — the 22 MANUAL cases

**Method.** These cases are UI-**rendering** behaviours that are fully determined by the frontend
source, so each was verified by **static inspection of the actual component code** (oracle =
`README.md`). This is deterministic for rendering/escaping/labels/visibility; the only thing it
does *not* produce is a pixel screenshot — the "Screenshot to capture" column says exactly what to
photograph when you run the apps for the report evidence.

Legend: **FAIL** = spec violation (candidate bug) · **PASS** = compliant · **PASS\*** = UI layer
compliant but a *server* defect exists (already filed).

## FR-05 — Web listing/search (`frontend-web/src/pages/Home.jsx`)

| Case | Rule | Verdict | Evidence (code) | Screenshot to capture |
|------|------|---------|-----------------|-----------------------|
| DT-01 (alt) | R2/FR-24 image has descriptive `alt` | **FAIL** | `Home.jsx:82` — `alt=""` (empty on every product image) | Home page → DevTools → an `<img>` with empty alt |
| DT-01 (price) | R3/FR-21 price uses `₫` + thousands sep | **FAIL** | `Home.jsx:87` — `{Number(p.price).toLocaleString()} VND` (uses "VND", not `₫`) | a product card showing "… VND" |
| DT-01 (`<h1>`) | R8 exactly one `<h1>` | **FAIL** | Two `<h1>`: `Home.jsx:43` ("Danh sách sản phẩm") **and** `Home.jsx:110` ("Hiển thị N sản phẩm") | DevTools → 2 `<h1>` elements |
| DT-08 | R6 loading state during fetch | **FAIL** | `Home.jsx:12-33` — `fetchProducts` sets no loading flag; nothing rendered while awaiting | throttle network, search → no spinner |
| DT-09 | R5 term shown as literal, no HTML | **FAIL** | `Home.jsx:64` — `<span dangerouslySetInnerHTML={{__html: search}}/>` → `<b>hi</b>` renders **bold**, not literal | search `<b>hi</b>` → bold text |
| DT-10 | R5/SEC-04 no unsafe HTML from term | **FAIL** | same `Home.jsx:64` — term injected as raw HTML (a bare `<script>` won't auto-run via innerHTML, but the HTML **is** injected — see DT-11) | search `<script>alert(1)</script>` → term injected in DOM |
| DT-11 | R5/SEC-04 no JS executes | **FAIL (XSS)** | `Home.jsx:64` innerHTML — `<img src=x onerror=alert(1)>` **executes** (onerror fires via innerHTML) → reflected XSS | search `<img src=x onerror=alert(1)>` → **alert pops** |
| DT-07 (UI) / DT-16 | R7/FR-24 no-results empty-state — "Khi không có kết quả tìm kiếm phải hiển thị thông báo empty state phù hợp" | **FAIL — browser-verified** | `Home.jsx:74-107`, `:109` — a no-match search (or empty catalog) renders a blank grid; the count `<h1>` is gated on `products.length > 0`, so **no message** appears | search `zzzzz` on :5173 → 0 results, no empty-state message (confirmed in browser) |
| DT-17 | R5/R7 empty-state must not echo raw term as HTML | **FAIL** | `Home.jsx:61-66` — the "Kết quả tìm kiếm cho: <term>" line renders the term via `dangerouslySetInnerHTML` regardless of results | search `<img src=x onerror=alert(1)>` → alert on the no-results view too |

> **Bonus vector:** `Home.jsx:68-72` renders server error strings via `dangerouslySetInnerHTML`
> too; combined with the SQL-injection error path (BUG-04) the backend's
> `<h1>Database Error</h1><p>${err.message}</p>` is injected verbatim.

## FR-09 — inactive coupon

| Case | Verdict | Note |
|------|---------|------|
| DT-05 | **not testable via API/UI alone** | Needs a DB-seeded `is_active=0` coupon (no endpoint sets it). Left as a DB-fixture manual step; not a UI case. |

## FR-14 — Admin category name rendering (`frontend-admin/src/App.jsx`)

| Case | Rule | Verdict | Evidence |
|------|------|---------|----------|
| DT-09 | SEC-04 category name escaped on display | **PASS** | `App.jsx:321` — `{c.name || ""}` renders as plain text (React auto-escapes); no `dangerouslySetInnerHTML` on category name. |

## FR-10 (Mobile) — cancellation UI (`frontend-mobile/App.js`)

| Case | Rule | Verdict | Evidence |
|------|------|---------|----------|
| DT-01 / BVA-01 | pending: red cancel button shown; tap cancels | **PASS** | `App.js:961` gates button on `pending`/`confirmed`; `App.js:962-967` red `smallRedButton` → `cancelOrder` |
| DT-02 / BVA-03 | confirmed: button shown | **PASS** | `App.js:961` includes `confirmed` |
| DT-03 | empty history empty-state (FR-24) | **PASS** | `App.js:948` — "Bạn chưa có đơn hàng nào." |
| DT-04 / BVA-05 | shipping: button hidden | **PASS** | `App.js:961` excludes `shipping` |
| DT-05 / BVA-07 | delivered: button hidden | **PASS** | `App.js:961` excludes `delivered` |
| DT-06 | canceled: button hidden | **PASS** | `App.js:961` excludes `canceled` |
| DT-11 | L1↔L2 consistency at shipping | **PASS\*** | UI hides the button (L1 correct) **but** the server accepts the cancel (L2) → **BUG-07**. The UI masks the server defect. |
| DT-12 | VN status labels (FR-21) | **PASS** | `App.js:331-340` maps all 5 states to Vietnamese |
| DT-13 | offline cancel: graceful | **PASS** | `App.js:322-328` try/catch → error `Alert`, no crash |

> **Observed (FR-23, out of the 22):** `App.js:941` labels the logout button **"Thoát"**; FR-23
> requires **"Đăng xuất"**.

---

## Summary of manual verification

- **FR-05 Web:** **8 FAILs** — a reflected **XSS** (DT-09/10/11/17, `dangerouslySetInnerHTML` on
  the search term) plus display-compliance breaches: empty `alt`, "VND" instead of `₫`, **two
  `<h1>`**, no loading state, no empty-state message.
- **FR-14 Admin:** DT-09 **PASS** (category name is escaped).
- **FR-10 Mobile:** all UI cases **PASS** — the button-gating, VN labels, empty state and offline
  handling are correct; the only FR-10 defect is server-side (**BUG-07**, already filed). This is
  the two-layer point in action: a UI-only pass does **not** clear FR-10.
- **FR-09 DT-05:** requires a DB fixture (`is_active=0`); not a UI defect.

### New candidate bugs found (not yet filed)
| Proposed | Sev | Title | Rule | Cases |
|----------|-----|-------|------|-------|
| BUG-10 | **Critical** | Reflected XSS in web search (`dangerouslySetInnerHTML` on the search term) | R5 / SEC-04 | FR05-DT-09/10/11/17 |
| BUG-11 | Low | FR-05 listing GUI non-compliance: two `<h1>`, empty image `alt`, "VND" not `₫`, no loading state, no empty-state message | R2/R3/R6/R7/R8, FR-21/FR-24 | FR05-DT-01/08/16 |
