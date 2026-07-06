**Severity:** Medium · **Feature:** FR-14 (Category CRUD) / FR-15 (Product integrity)

### Spec (oracle = README.md)
FR-15 — a product's category "phải chọn từ danh sách có sẵn" (must be one of the available
categories); i.e. every product must reference a **valid** category. FR-14's delete performs no
integrity guard, so deleting a category leaves its products dangling.
(Note: FR-14 does not itself define cascade behaviour; the violated invariant is FR-15's
"category must be from the available list.")

### Steps
```bash
A=$(curl -s -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
   -d '{"email":"admin@eshop.com","password":"Admin123!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
CID=$(curl -s -X POST http://localhost:3000/api/categories -H "Authorization: Bearer $A" \
   -H "Content-Type: application/json" -d '{"name":"Temp"}' | sed -E 's/.*"id":([0-9]+).*/\1/')
PID=$(curl -s -X POST http://localhost:3000/api/products -H "Authorization: Bearer $A" \
   -H "Content-Type: application/json" \
   -d "{\"name\":\"P\",\"price\":1000,\"description\":\"\",\"imageUrl\":\"\",\"category_id\":$CID}" \
   | sed -E 's/.*"id":([0-9]+).*/\1/')
curl -s -X DELETE http://localhost:3000/api/categories/$CID -H "Authorization: Bearer $A" >/dev/null
curl -s http://localhost:3000/api/categories   # $CID is gone
curl -s http://localhost:3000/api/products     # product $PID still has category_id=$CID
```

### Expected
Either the delete is prevented while products reference the category, or products are
reassigned/removed — so **no product ends up referencing a non-existent category**.

### Actual
`DELETE` returns `200 "Category deleted"` and the product is **orphaned**: it still carries
`category_id` pointing at the now-deleted category (observed: product references `category_id` no
longer present in `GET /api/categories`). Silent data-integrity corruption.

### Evidence
![evidence](https://raw.githubusercontent.com/linhkhoi1309/eshop-sut/main/docs/evidence/bug-09.png)

### Traceability
Case: `FR14-INTEG-01`.
