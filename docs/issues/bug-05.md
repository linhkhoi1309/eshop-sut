**Severity:** Medium · **Feature:** FR-14 (Category CRUD)

### Spec (oracle = README.md)
FR-14 — "Tên danh mục là bắt buộc, không được để trống" (name required, non-empty).

### Steps
```bash
A=$(curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
   -d '{"email":"admin@eshop.com","password":"Admin123!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/categories \
   -H "Authorization: Bearer $A" -H "Content-Type: application/json" -d '{"name":""}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/categories \
   -H "Authorization: Bearer $A" -H "Content-Type: application/json" -d '{"name":"   "}'
```

### Expected
Reject — name is required and must not be empty.

### Actual
`200` for both — an empty and a whitespace-only category are created. The endpoint performs no
non-empty validation on `name`.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-05.png)

### Traceability
Cases: `FR14-DT-03`, `FR14-DT-04`, `FR14-BVA-01`, `FR14-BVA-04`.
