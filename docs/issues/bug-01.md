**Severity:** High · **Feature:** FR-09 (Coupons)

### Spec (oracle = README.md)
FR-09 **C3** — "Tổng đơn hàng **>= (lớn hơn hoặc bằng)** `min_order_amount`".

### Steps
```bash
curl -s -X POST http://localhost:3000/api/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE10","total_amount":300000,"user_id":2}'
```

### Expected
Coupon **applies** at exactly the minimum (SAVE10 min 300,000): discount 30,000; final 270,000.

### Actual
`400 {"error":"Đơn hàng chưa đủ giá trị tối thiểu 300,000 ₫ …"}`. The check uses
`total_amount > min_order_amount` (strict `>`) instead of `>=`, so an order equal to the minimum
is wrongly rejected. Reproduced for BIGBUY (500,000) and VIP100 (300,000).

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-01.png)

### Traceability
Cases: `FR09-BVA-02`, `FR09-BVA-05`, `FR09-BVA-08`, `FR09-DT-01`, `FR09-DT-02`.
