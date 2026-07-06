**Severity:** High · **Feature:** FR-09 (Coupons)

### Spec (oracle = README.md)
FR-09 — percent: `discount_amount = total × discount_value / 100`;
`final_amount = total − discount_amount`.

### Steps
```bash
curl -s -X POST http://localhost:3000/api/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE10","total_amount":1000000,"user_id":2}'
```

### Expected
discount 100,000; final 900,000 (10% of 1,000,000).

### Actual
`200 {"discount_amount":-9000000,"final_amount":10000000}`. The code computes
`discount = floor(total × (1 − discount_value))` (treating `discount_value=10` as a fraction),
giving a large **negative** discount and a final **larger** than the order total. At
`total_amount = 9,999,999,999` the discount is `-89,999,999,991`.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-02.png)

### Traceability
Cases: `FR09-DT-17`, `FR09-BVA-03`, `FR09-BVA-22`.
