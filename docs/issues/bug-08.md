**Severity:** High · **Feature:** FR-10 (Order state machine — Admin)

### Spec (oracle = README.md)
FR-10 — `delivered` and `canceled` are **final states**: "không được phép chuyển sang bất kỳ
trạng thái nào khác." A `canceled → delivered` transition must be rejected.

### Steps
```bash
U=$(curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
   -d '{"email":"test@eshop.com","password":"Test1234!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
A=$(curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
   -d '{"email":"admin@eshop.com","password":"Admin123!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
OID=$(curl -s -X POST http://localhost:3000/api/checkout -H "Authorization: Bearer $U" \
   -H "Content-Type: application/json" -d '{"total_amount":100000,"shipping_address":"x"}' \
   | sed -E 's/.*"orderId":([0-9]+).*/\1/')
curl -s -X PUT http://localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $A" \
   -H "Content-Type: application/json" -d '{"status":"canceled"}' >/dev/null
curl -s -X PUT http://localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $A" \
   -H "Content-Type: application/json" -d '{"status":"delivered"}'      # resurrect a canceled order
```

### Expected
Reject (4xx) — `canceled` is a terminal state.

### Actual
`200 {"message":"Order status updated"}` — the canceled order is moved to `delivered`. The admin
status handler explicitly whitelists this transition
(`if (currentStatus === "canceled" && status === "delivered") isValidTransition = true;`),
letting a terminal order be resurrected (and, e.g., wrongly counted as revenue).

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-08.png)

### Traceability
Case: `FR10-ADM-01` (control cases `FR10-ADM-02` delivered→shipping and `FR10-ADM-03`
pending→confirmed pass, confirming the machine is otherwise enforced).
