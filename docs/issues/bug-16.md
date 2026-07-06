**Severity:** Low · **Feature:** FR-05 (Product listing — Web)

### Spec (oracle = README.md)
FR-05 R6 — while data is loading, a **loading state** must be shown
("Khi đang tải dữ liệu phải hiển thị trạng thái loading").

### Steps
Open http://localhost:5173; DevTools → Network → throttle to **Slow 3G**, then search.

### Expected
A loading indicator (spinner / skeleton / "Đang tải…") while the request is in flight.

### Actual
No loading state at all. `fetchProducts` sets no loading flag and nothing is rendered during the
await — `frontend-web/src/pages/Home.jsx:12-33`. The list simply pops in when the response arrives.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-16.png)

### Traceability
Case: `FR05-DT-08`. See `docs/manual-ui-verification.md`.
