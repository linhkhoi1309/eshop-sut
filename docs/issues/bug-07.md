**Severity:** High · **Feature:** FR-10 (Order cancellation — Mobile)

### Spec (oracle = README.md)
FR-10 — when an order is `shipping`, the **User may NOT self-cancel** (admin only);
FR-20 — mobile cancel is allowed only when `pending` / `confirmed`.

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
   -H "Content-Type: application/json" -d '{"status":"confirmed"}' >/dev/null
curl -s -X PUT http://localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $A" \
   -H "Content-Type: application/json" -d '{"status":"shipping"}' >/dev/null
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3000/api/orders/$OID/cancel \
   -H "Authorization: Bearer $U"                       # user cancels the shipping order
```

### Expected
Reject (4xx) — a user cannot cancel once the order is `shipping`.

### Actual
`200` — the cancel succeeds. `/api/orders/:id/cancel` only rejects `delivered` / `canceled`;
`shipping` falls through and is cancelled. The **mobile UI hides the button (L1)** for a shipping
order, so this defect is only exposed at the **API layer (L2)** — a UI-only test would miss it.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-07.png)

### Traceability
Cases: `FR10-DT-07`, `FR10-BVA-06`.
