**Severity:** Low · **Feature:** FR-05 (Product listing — Web)

### Spec (oracle = README.md)
FR-05 R7 / FR-24 — when a search returns **no results**, a suitable **empty-state** message must be
shown ("Khi không có kết quả tìm kiếm phải hiển thị thông báo empty state phù hợp"). Same for an
empty catalog.

### Steps
Open http://localhost:5173; search a non-matching term, e.g. **`zzzzz`**.

### Expected
A friendly empty-state message (icon + "Không tìm thấy sản phẩm…").

### Actual (browser-verified 2026-07-03)
`zzzzz` → 0 results and a **blank area, no message**. `frontend-web/src/pages/Home.jsx:74-107`
renders an empty grid, and the only status line (`:109`) is gated on `products.length > 0`, so
nothing appears when the result set is empty.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-17.png)

### Traceability
Cases: `FR05-DT-07` (no-match search), `FR05-DT-16` (empty catalog). See `docs/manual-ui-verification.md`.
