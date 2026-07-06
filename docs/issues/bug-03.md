**Severity:** High · **Feature:** FR-09 (Coupons)

### Spec (oracle = README.md)
FR-09 **C4** — user must be logged in; **SEC-02** — secured APIs require a valid JWT.

### Steps
```bash
curl -s -X POST http://localhost:3000/api/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE10","total_amount":500000}'          # no token, no user_id
```

### Expected
Reject — a valid login/JWT is required (C4).

### Actual
`200 {"success":true,...}` — the coupon is applied for an anonymous request. `/api/apply-coupon`
has no auth middleware and treats `user_id` as optional; omitting it also **bypasses the per-user
usage cap (C5)** because usage can't be attributed to a user.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-03.png)

### Traceability
Case: `FR09-DT-09`. (Related: `FR09-DT-16` passes only because BUG-01's `>`-min bug rejects it
first, masking the same auth gap.)
