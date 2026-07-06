**Severity:** Critical · **Feature:** FR-05 (Product search — Web)

### Spec (oracle = README.md)
FR-05 R5 — the search term must be "hiển thị an toàn (không render HTML)". **SEC-04** — user input
displayed on the UI must be escaped; do not use `innerHTML` directly.

### Steps (web app, http://localhost:5173)
1. On the home page, type `<b>hi</b>` in the search box and submit.
2. Then search `<img src=x onerror=alert(1)>`.

### Expected
The term is shown as **literal, escaped text**; no HTML is rendered and no JavaScript runs.

### Actual
The search term is rendered via **`dangerouslySetInnerHTML`** (`frontend-web/src/pages/Home.jsx:64`):
- `<b>hi</b>` → renders as **bold** (HTML injected), not literal text.
- `<img src=x onerror=alert(1)>` → the `onerror` handler **executes** → `alert(1)` fires =
  **reflected XSS**.
- The same unsafe render is on the "no results" view (`Home.jsx:61-66`), and server error strings
  are also injected via `dangerouslySetInnerHTML` (`Home.jsx:68-72`), compounding with the SQL
  error path (see issue for BUG-04).

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-10.png) <!-- screenshot of the alert() firing -->

### Traceability
Cases: `FR05-DT-09`, `FR05-DT-10`, `FR05-DT-11`, `FR05-DT-17`. Code: `frontend-web/src/pages/Home.jsx:64`.
