# Bug evidence (screenshots)

Drop one screenshot per bug here, named to match what the reports reference.

## Required filenames (one per bug)
| File | Bug | Issue | What to capture |
|------|-----|-------|-----------------|
| `bug-01.png` | BUG-01 | #2 | apply-coupon SAVE10 @300,000 → `400` "chưa đủ giá trị tối thiểu" (Postman/cURL) |
| `bug-02.png` | BUG-02 | #3 | apply-coupon SAVE10 @1,000,000 → `discount_amount: -9000000` |
| `bug-03.png` | BUG-03 | #4 | apply-coupon with no token/user_id → `200 success` |
| `bug-04.png` | BUG-04 | #1 | web search `%` (or `' OR '1'='1`) → all 5 products |
| `bug-05.png` | BUG-05 | #7 | admin adds a category with an empty name → accepted |
| `bug-06.png` | BUG-06 | #5 | non-admin token POST /api/categories → `200` (should be 403) |
| `bug-07.png` | BUG-07 | #6 | user cancels a `shipping` order → `200` |
| `bug-08.png` | BUG-08 | #8 | admin `canceled` → `delivered` → `200` |
| `bug-09.png` | BUG-09 | #9 | delete category with products → product orphaned |
| `bug-10.png` | BUG-10 | #10 | web search `<img src=x onerror=alert(1)>` → **alert() popup** |
| `bug-11.png` | BUG-11 | #11 | console `document.querySelectorAll('h1').length` → `2` |
| `bug-12.png` | BUG-12 | #12 | apply-coupon `save10` (lowercase) → `404` |
| `bug-13.png` | BUG-13 | #13 | non-admin PUT /api/admin/orders/:id/status → `200` |
| `bug-14.png` | BUG-14 | #15 | product `<img>` in DevTools showing `alt=""` |
| `bug-15.png` | BUG-15 | #16 | product price showing "… VND" |
| `bug-16.png` | BUG-16 | #17 | throttled search, no loading spinner |
| `bug-17.png` | BUG-17 | #18 | web search `zzzzz` → 0 results, no empty-state message |

## Two ways to attach to a GitHub issue
1. **Drag-drop into the issue on github.com (recommended).** Open the issue → drag the PNG into the
   comment/description box → GitHub uploads it to its CDN and embeds a
   `https://github.com/user-attachments/...` URL. This is the most reliable — **repo-relative image
   links (`../evidence/bug-XX.png`) do _not_ render inside issue bodies**, only in repo Markdown files.
2. **Commit the PNGs here** (`git add docs/evidence && git commit && git push`). This makes the
   images render in `docs/bug-report.md` when browsing the repo, and gives you a stable in-repo copy —
   but you still need method (1) to show them _inside_ the issues.

Do **both** for full marks: commit the files here *and* drag them into each issue.
