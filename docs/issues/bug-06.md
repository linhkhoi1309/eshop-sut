**Severity:** High · **Feature:** FR-14 (Category CRUD)

### Spec (oracle = README.md)
FR-12 / **SEC-03** — admin APIs and `POST/PUT/DELETE /api/categories` must require a valid JWT
**and** `role='admin'`, not merely the presence of a token.

### Steps
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
  -d '{"email":"test@eshop.com","password":"Test1234!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Hacked"}'
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/categories/2 \
  -H "Authorization: Bearer $TOKEN"
```

### Expected
`403 Forbidden` for a non-admin token.

### Actual
`200` for both create and delete. `authenticateToken` verifies the JWT but never checks `role`,
so any logged-in user can create and delete categories.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-06.png)

### Traceability
Cases: `FR14-DT-05`, `FR14-DT-07`, `FR14-DT-14`.
