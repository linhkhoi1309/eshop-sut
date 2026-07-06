**Severity:** Critical · **Feature:** FR-05 (Product search)

### Spec (oracle = README.md)
FR-05 R4 — search **by name**; R5 — term rendered safely; **SEC-05** — parameterised queries, no
string concatenation.

### Steps
```bash
curl -s "http://localhost:3000/api/products?search=%25"        # %25 = a literal '%'
curl -s "http://localhost:3000/api/products?search=' OR '1'='1"
curl -s "http://localhost:3000/api/products?search=Mac_ook"
```

### Expected
Each is a *literal* name search → **0 results** (no product name contains `%`, `' OR '1'='1`, or
`Mac_ook`).

### Actual
`%` → **all 5 products**; `' OR '1'='1` → **all 5**; `Mac_ook` → **MacBook Pro M3** (`_` acted as
a SQL wildcard). The query `WHERE name LIKE '%<term>%'` is built by string concatenation, so `%`,
`_`, `'` are interpreted as SQL — a working SQL-injection / data-leak vector.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-04.png) <!-- attach screenshot / JSON capture -->

### Traceability
Cases: `FR05-DT-12`, `FR05-DT-13`, `FR05-BVA-10`, `FR05-BVA-11`, `FR05-BVA-12` — see
`docs/test-results.md`.
