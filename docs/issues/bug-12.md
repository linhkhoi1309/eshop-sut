**Severity:** Low · **Feature:** FR-09 (Coupons)

### Summary
Coupon-code lookup at the API is **case-sensitive**, so a valid coupon entered in a different
case is reported as non-existent. This is a robustness / consistency gap (FR-09 does not *mandate*
case-insensitive codes, but the behaviour is inconsistent with the case-insensitive product search
and only works from the UI because the frontends upper-case the input first).

### Steps
```bash
curl -s -X POST http://localhost:3000/api/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"save10","total_amount":500000,"user_id":2}'
```

### Expected
`save10` refers to the same coupon as the seeded `SAVE10`, so the request should apply the coupon
(or at least behave consistently with the case-insensitive `LIKE` product search).

### Actual
`404 {"error":"Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa"}`. The query
`SELECT * FROM coupons WHERE code = ? AND is_active = 1` uses SQLite's default **BINARY** collation,
so `'save10' != 'SAVE10'` and no row matches. Real users don't hit this because
`frontend-mobile/App.js:366` (and the web checkout) call `.toUpperCase()` before sending — but the
raw API is inconsistent.

### Suggested fix
`WHERE code = ? COLLATE NOCASE` (or normalise the code server-side).

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-12.png)

### Traceability
Case: `FR09-DT-14`. Contrast with `FR05-DT-04` (product search *is* case-insensitive via `LIKE`).
