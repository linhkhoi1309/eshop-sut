**Severity:** High · **Feature:** FR-10 (Order state machine) — FR-12 / SEC-03

### Spec (oracle = README.md)
FR-12 / **SEC-03** — admin APIs (`/api/admin/*`) must require a valid JWT **and** `role='admin'`,
not merely the presence of a token. `PUT /api/admin/orders/:id/status` drives the FR-10 order state
machine, so it must be admin-only.

### Steps
```bash
U=$(curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
   -d '{"email":"test@eshop.com","password":"Test1234!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
OID=$(curl -s -X POST http://localhost:3000/api/checkout -H "Authorization: Bearer $U" \
   -H "Content-Type: application/json" -d '{"total_amount":100000,"shipping_address":"x"}' \
   | sed -E 's/.*"orderId":([0-9]+).*/\1/')
# non-admin user drives the order state machine:
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3000/api/admin/orders/$OID/status \
   -H "Authorization: Bearer $U" -H "Content-Type: application/json" -d '{"status":"confirmed"}'
```

### Expected
`403 Forbidden` — a non-admin must not change order status.

### Actual
`200 {"message":"Order status updated"}` — a normal user can move **any** order through the state
machine (confirm / ship / deliver / cancel). The route uses `authenticateToken` only
(`backend/server.js:525`) and never checks `role`.

Related instances of the same missing-role gap (SEC-03): `GET /api/admin/orders` (`:510`) lets any
logged-in user list **all** orders. (Category endpoints are covered separately by BUG-06.)

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-13.png)

### Traceability
Case: `FR10-SEC-01` (auto). Same defect class as BUG-06 (categories), here on the order state machine.
