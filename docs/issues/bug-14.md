**Severity:** Low · **Feature:** FR-05 (Product listing — Web)

### Spec (oracle = README.md)
FR-05 R2 / FR-24 — every product image must have a **descriptive, non-empty `alt`** attribute.

### Steps
Open http://localhost:5173; in DevTools inspect any product `<img>`.

### Expected
`alt` describes the product image, e.g. `alt="iPhone 15 Pro Max"`.

### Actual
`alt=""` (empty) on **every** product image — `frontend-web/src/pages/Home.jsx:82`
(`<img src={p.imageUrl} alt="" … />`). Fails accessibility and FR-24.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-14.png)

### Traceability
Case: `FR05-DT-01` (alt sub-check). See `docs/manual-ui-verification.md`.
