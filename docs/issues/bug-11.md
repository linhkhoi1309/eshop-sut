**Severity:** Low · **Feature:** FR-05 (Product listing — Web)

### Spec (oracle = README.md)
FR-05 R8 / FR-21 — each page must have **exactly one** `<h1>`.

### Steps
Open http://localhost:5173; in the DevTools console run:
```js
document.querySelectorAll('h1').length
```

### Expected
`1`.

### Actual
`2`. The page renders two `<h1>` elements: **"Danh sách sản phẩm"** (`frontend-web/src/pages/Home.jsx:43`)
and **"Hiển thị N sản phẩm"** (`Home.jsx:110`, shown whenever products exist). The second should be a
lower-level element (`<p>`/`<h2>`), not an `<h1>`.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-11.png)

### Traceability
Case: `FR05-DT-01` (single-`<h1>` sub-check). See `docs/manual-ui-verification.md`.
