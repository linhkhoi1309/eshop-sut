**Severity:** Low · **Feature:** FR-05 (Product listing — Web)

### Spec (oracle = README.md)
FR-05 R3 / FR-21 — prices must use the **`₫`** currency symbol with a thousands separator
("Luôn dùng ký hiệu `₫` với định dạng phân cách hàng nghìn").

### Steps
Open http://localhost:5173; look at any product price on the listing.

### Expected
e.g. **`30.000.000 ₫`**.

### Actual
Shows **`30,000,000 VND`** — wrong currency unit ("VND" instead of `₫`) —
`frontend-web/src/pages/Home.jsx:87` (`{Number(p.price).toLocaleString()} VND`).

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-15.png)

### Traceability
Case: `FR05-DT-01` (price-format sub-check). See `docs/manual-ui-verification.md`.
