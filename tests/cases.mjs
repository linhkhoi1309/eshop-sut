// EShop case registry — generated from docs/test-design-report.md (124 cases).
// Oracle = README.md spec (encoded in each `expected`). On this deliberately-buggy SUT a
// FAIL means a candidate bug, NOT a broken test. Do not weaken assertions to go green.
//
// kind: "auto"  -> HTTP-observable; run() returns {actual, pass:boolean, reason}
//       "manual"-> needs device/DOM; carries `steps`; runner marks MANUAL
//       "probe" -> spec-undefined/ambiguous; run() returns pass:null (record only)
import {
  api, makeOrder, makeForeignOrder, makeTempCoupon, seedCouponUsage, dateOffset,
} from "./harness.mjs";

// ---- generic helpers ---------------------------------------------------------
const rows = (b) => (Array.isArray(b) ? b : null);
const names = (b) => (rows(b) ?? []).map((p) => String(p.name ?? "").toLowerCase());
const search = (term) => api("GET", "/api/products?search=" + encodeURIComponent(term));

function S(id, feature, term, expected, assert) {          // product-search auto case
  return { id, feature, kind: "auto", expected, async run() {
    const r = await search(term); const b = r.body;
    const { pass, reason } = assert(b, r.status);
    return { actual: rows(b) ? `${rows(b).length} rows` : `status ${r.status}`, pass, reason };
  } };
}
const countIs = (n) => (b) => ({ pass: rows(b)?.length === n, reason: rows(b) ? "" : "not an array" });
const zero = () => (b, s) => ({ pass: s < 500 && rows(b)?.length === 0, reason: s >= 500 ? "server error" : (rows(b)?.length ? "leaked rows" : "") });
const has = (sub) => (b) => ({ pass: names(b).some((n) => n.includes(sub.toLowerCase())), reason: "" });
const allHave = (sub) => (b) => ({ pass: rows(b)?.length > 0 && names(b).every((n) => n.includes(sub.toLowerCase())), reason: "" });

function coupon(id, expected, { code, total, anon = false, discount = null, final = null }) {
  return { id, feature: "FR-09", kind: "auto", expected, async run(ctx) {
    const body = { code, total_amount: total }; if (!anon) body.user_id = ctx.ids.user;
    const r = await api("POST", "/api/apply-coupon", { body });
    let pass = r.status === 200;
    if (pass && discount != null) pass = r.body?.discount_amount === discount;
    if (pass && final != null) pass = r.body?.final_amount === final;
    return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass, reason: pass ? "" : "differs from spec" };
  } };
}
const couponApplied = (id, expected, o) => ({ ...coupon(id, expected, o), async run(ctx) {           // apply = accepted at all (isolates usage/expiry from the formula bug)
  const body = { code: o.code, total_amount: o.total }; if (!o.anon) body.user_id = ctx.ids.user;
  const r = await api("POST", "/api/apply-coupon", { body });
  return { actual: `status ${r.status}`, pass: r.status === 200, reason: r.status === 200 ? "" : "coupon not accepted" };
} });
const couponLoose = (id, expected, o) => ({ id, feature: "FR-09", kind: "auto", expected, async run(ctx) { // applies AND a real discount (final < total, positive)
  const r = await api("POST", "/api/apply-coupon", { body: { code: o.code, total_amount: o.total, user_id: ctx.ids.user } });
  const f = r.body?.final_amount;
  const pass = r.status === 200 && typeof f === "number" && f > 0 && f < o.total;
  return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass, reason: pass ? "" : "no valid discount applied" };
} });
const couponReject = (id, expected, o) => ({ id, feature: "FR-09", kind: "auto", expected, async run(ctx) {
  const body = { code: o.code, total_amount: o.total }; if (!o.anon) body.user_id = ctx.ids.user;
  const r = await api("POST", "/api/apply-coupon", { body });
  return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "coupon wrongly accepted" };
} });

function cat(id, expected, { name, actor, expect }) {      // category create auto case
  return { id, feature: "FR-14", kind: "auto", expected, async run(ctx) {
    const token = actor === "admin" ? ctx.tokens.admin : actor === "user" ? ctx.tokens.user : undefined;
    const r = await api("POST", "/api/categories", { token, body: { name } });
    let pass;
    if (expect === "ok") pass = r.status === 200 || r.status === 201;
    else if (expect === "reject") pass = r.status >= 400;
    else pass = r.status === expect; // numeric status
    return { actual: `status ${r.status}`, pass, reason: pass ? "" : `expected ${expect}, got ${r.status}` };
  } };
}
const cancel = (id, feature, expected, state, { reject }) => ({ id, feature, kind: "auto", expected, async run(ctx) {
  const orderId = await makeOrder(ctx, state);
  const r = await api("PUT", `/api/orders/${orderId}/cancel`, { token: ctx.tokens.user });
  const pass = reject ? r.status >= 400 : r.status === 200;
  return { actual: `status ${r.status}`, pass, reason: pass ? "" : (reject ? "illegal cancel accepted" : "valid cancel rejected") };
} });
const manual = (id, feature, expected, steps) => ({ id, feature, kind: "manual", expected, steps });
const probe = (id, feature, expected, run) => ({ id, feature, kind: "probe", expected, run });

// ============================ FR-05 — Product search ==========================
const FR05 = [
  manual("FR05-DT-01", "FR-05", "Product in grid; image alt; price 30.000.000 ₫; exactly one <h1> (R1/R2/R3/R8)",
    "Web UI: search `iPhone 15 Pro Max`. Verify grid item, non-empty img alt, ₫ thousands format, and exactly one <h1> (DevTools → Elements)."),
  S("FR05-DT-02", "FR-05", "Mac", "Returns MacBook Pro M3 (R4)", has("macbook")),
  S("FR05-DT-03", "FR-05", "Pro", "All names containing 'Pro' (R4)", allHave("pro")),
  probe("FR05-DT-04", "FR-05", "spec-undefined — case-insensitivity of search", async () => {
    const r = await search("iphone"); return { actual: `${rows(r.body)?.length} rows`, pass: null, reason: "record only" }; }),
  S("FR05-DT-05", "FR-05", "Bàn phím", "Returns Keychron (R4)", has("keychron")),
  S("FR05-DT-06", "FR-05", "", "Empty ⇒ all 5 products (R1/R4)", countIs(5)),
  S("FR05-DT-07", "FR-05", "zzzzz", "0 results + empty state (R7)", zero()),
  manual("FR05-DT-08", "FR-05", "Loading indicator visible during fetch (R6)", "Throttle network (DevTools) and search; confirm a loading state shows."),
  manual("FR05-DT-09", "FR-05", "`<b>hi</b>` shown as literal text, not bold (R5)", "Search `<b>hi</b>`; confirm the term is not rendered as bold HTML."),
  manual("FR05-DT-10", "FR-05", "No script executes; term escaped (R5/SEC-04)", "Search `<script>alert(1)</script>`; confirm no alert fires and text is escaped."),
  manual("FR05-DT-11", "FR-05", "No JS executes from img onerror (R5)", "Search `<img src=x onerror=alert(1)>`; confirm no alert."),
  S("FR05-DT-12", "FR-05", "' OR '1'='1", "Literal → 0 results; must NOT return all/other rows (R4/SEC-05)", zero()),
  S("FR05-DT-13", "FR-05", "x'--", "Literal → 0 results; no 500 (R4/SEC-05)", zero()),
  { id: "FR05-DT-14", feature: "FR-05", kind: "auto", expected: "Table intact; injection is a safe literal (SEC-05)",
    async run() { await search("'; DROP TABLE products;--"); const r = await api("GET", "/api/products");
      const pass = rows(r.body)?.length > 0; return { actual: `${rows(r.body)?.length} rows after`, pass, reason: pass ? "" : "products table missing/empty" }; } },
  S("FR05-DT-15", "FR-05", "x".repeat(10000), "Graceful: 0 results, no crash (R4/R7)", zero()),
  manual("FR05-DT-16", "FR-05", "Empty catalog ⇒ empty-state, not a broken grid (R1/R7)", "Delete all products (admin), open the listing; confirm a friendly empty state."),
  manual("FR05-DT-17", "FR-05", "Empty-state message must not echo the raw term as HTML (R5/R7)", "Search `<script>alert(1)</script>`; read the 'no results' message; confirm no script and escaped text."),
  probe("FR05-DT-18", "FR-05", "spec-undefined — accent-folding × case (`ban phim`)", async () => {
    const r = await search("ban phim"); return { actual: `${rows(r.body)?.length} rows`, pass: null, reason: "record only" }; }),
  S("FR05-BVA-01", "FR-05", "", "Length 0 ⇒ all 5 (R1)", countIs(5)),
  S("FR05-BVA-02", "FR-05", "i", "Products containing 'i' (R4)", has("i")),
  S("FR05-BVA-03", "FR-05", "iP", "Narrows toward iPhone (R4)", has("iphone")),
  S("FR05-BVA-04", "FR-05", "z".repeat(255), "255-char non-match ⇒ 0 results (R4/R7)", zero()),
  probe("FR05-BVA-05", "FR-05", "spec-undefined — 256-char (any cap?)", async () => {
    const r = await search("z".repeat(256)); return { actual: `status ${r.status}, ${rows(r.body)?.length} rows`, pass: null, reason: "record only" }; }),
  S("FR05-BVA-06", "FR-05", "z".repeat(10000), "10 000-char ⇒ no crash, 0 results (R4/R7)", zero()),
  S("FR05-BVA-07", "FR-05", "Keychronx", "0-result side of the empty-state trigger (R7)", zero()),   // non-destructive variant of 'delete Keychron'
  S("FR05-BVA-08", "FR-05", "Keychron", "Exactly 1 result (R1/R4)", countIs(1)),
  S("FR05-BVA-09", "FR-05", "", "UB=5 ⇒ all products (R1)", countIs(5)),
  S("FR05-BVA-10", "FR-05", "%", "`%` is literal ⇒ 0 results; must NOT return all products (R4/R7)", zero()),
  S("FR05-BVA-11", "FR-05", "Mac_ook", "`_` literal ⇒ 0 results; must not match MacBook (R4)", zero()),
  S("FR05-BVA-12", "FR-05", "Mac%Pro", "`%` literal ⇒ 0 results; must not match MacBook Pro (R4)", zero()),
  S("FR05-BVA-13", "FR-05", "iPhone", "Prefix match (R4)", has("iphone")),
  S("FR05-BVA-14", "FR-05", "Ultra", "Suffix match — Samsung … S24 Ultra (R4)", has("samsung")),
  S("FR05-BVA-15", "FR-05", "MacBookX", "Off-by-one ⇒ 0 results (R4/R7)", zero()),
];

// ============================ FR-09 — Coupons =================================
const FR09 = [
  coupon("FR09-DT-01", "Apply; discount 30,000; final 270,000 (SAVE10 percent)", { code: "SAVE10", total: 300000, discount: 30000, final: 270000 }),
  coupon("FR09-DT-02", "Apply; discount 50,000; final 450,000 (BIGBUY fixed)", { code: "BIGBUY", total: 500000, discount: 50000, final: 450000 }),
  { id: "FR09-DT-03", feature: "FR-09", kind: "auto", expected: "Apply — usage 1 < max 2 (C5)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 100000, min: 1000, expired_at: dateOffset(3650), max: 2 });
    await seedCouponUsage(ctx, c.id, 1);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status === 200, reason: r.status === 200 ? "" : "rejected despite uses < max" }; } },
  couponReject("FR09-DT-04", "Reject — code does not exist (C1)", { code: "NOPE999", total: 500000 }),
  manual("FR09-DT-05", "FR-09", "Reject — inactive coupon (C1 is_active=1)", "Seed a coupon with is_active=0 in the DB, then apply it; expect rejection. (No API to set is_active.)"),
  couponReject("FR09-DT-06", "Reject — empty code ('Vui lòng nhập mã')", { code: "", total: 500000 }),
  couponReject("FR09-DT-07", "Reject — below min 300,000 (C3)", { code: "SAVE10", total: 299999 }),
  couponReject("FR09-DT-08", "Reject — expired (C2)", { code: "EXPIRED", total: 200000 }),
  couponReject("FR09-DT-09", "Reject — must be logged in (C4)", { code: "SAVE10", total: 500000, anon: true }),
  { id: "FR09-DT-10", feature: "FR-09", kind: "auto", expected: "Reject — uses = max (C5)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 50000, min: 1000, expired_at: dateOffset(3650), max: 1 });
    await seedCouponUsage(ctx, c.id, 1);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "accepted despite uses = max" }; } },
  couponReject("FR09-DT-11", "Reject — below min / invalid amount (C3)", { code: "SAVE10", total: 0 }),
  couponReject("FR09-DT-12", "Reject — invalid/below min (spec-undefined on negatives)", { code: "SAVE10", total: -100000 }),
  couponReject("FR09-DT-13", "Reject safely; no SQL leak (C1/SEC-05)", { code: "' OR '1'='1", total: 500000 }),
  probe("FR09-DT-14", "FR-09", "spec-undefined — coupon code case-sensitivity (`save10`)", async (ctx) => {
    const r = await api("POST", "/api/apply-coupon", { body: { code: "save10", total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass: null, reason: "record only" }; }),
  couponReject("FR09-DT-15", "Reject — fails C2 and C3 (expired + below min)", { code: "EXPIRED", total: 50000 }),
  couponReject("FR09-DT-16", "Reject — anonymous must not bypass usage cap via missing user_id (C4)", { code: "VIP100", total: 300000, anon: true }),
  coupon("FR09-DT-17", "discount 100,000; final 900,000 (percent 10% of 1,000,000)", { code: "SAVE10", total: 1000000, discount: 100000, final: 900000 }),

  couponReject("FR09-BVA-01", "Reject — below min (LB−1)", { code: "SAVE10", total: 299999 }),
  coupon("FR09-BVA-02", "APPLY at exactly min; discount 30,000; final 270,000 (C3 '>=', LB)", { code: "SAVE10", total: 300000, discount: 30000, final: 270000 }),
  couponLoose("FR09-BVA-03", "Apply just above min; real discount (LB+1)", { code: "SAVE10", total: 300001 }),
  couponReject("FR09-BVA-04", "Reject — below min (BIGBUY LB−1)", { code: "BIGBUY", total: 499999 }),
  coupon("FR09-BVA-05", "APPLY at min; discount 50,000; final 450,000 (BIGBUY LB)", { code: "BIGBUY", total: 500000, discount: 50000, final: 450000 }),
  couponLoose("FR09-BVA-06", "Apply just above min (BIGBUY LB+1)", { code: "BIGBUY", total: 500001 }),
  couponReject("FR09-BVA-07", "Reject — below min (VIP100 LB−1)", { code: "VIP100", total: 299999 }),
  coupon("FR09-BVA-08", "APPLY at min; discount 100,000; final 200,000 (VIP100 LB)", { code: "VIP100", total: 300000, discount: 100000, final: 200000 }),
  couponLoose("FR09-BVA-09", "Apply just above min (VIP100 LB+1)", { code: "VIP100", total: 300001 }),
  couponApplied("FR09-BVA-10", "Apply — usage 0 < max 1 (SAVE10, above min)", { code: "SAVE10", total: 500000 }),
  { id: "FR09-BVA-11", feature: "FR-09", kind: "auto", expected: "Reject — uses = max 1 (C5 '<' edge)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 50000, min: 1000, expired_at: dateOffset(3650), max: 1 });
    await seedCouponUsage(ctx, c.id, 1);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "accepted at uses = max" }; } },
  { id: "FR09-BVA-12", feature: "FR-09", kind: "auto", expected: "Reject — uses > max 1", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 50000, min: 1000, expired_at: dateOffset(3650), max: 1 });
    await seedCouponUsage(ctx, c.id, 2);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "accepted over limit" }; } },
  { id: "FR09-BVA-13", feature: "FR-09", kind: "auto", expected: "Apply — uses 1 < max 2 (UB−1)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 100000, min: 1000, expired_at: dateOffset(3650), max: 2 });
    await seedCouponUsage(ctx, c.id, 1);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status === 200, reason: r.status === 200 ? "" : "rejected below max" }; } },
  { id: "FR09-BVA-14", feature: "FR-09", kind: "auto", expected: "Reject — uses = max 2 (UB edge)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 100000, min: 1000, expired_at: dateOffset(3650), max: 2 });
    await seedCouponUsage(ctx, c.id, 2);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "accepted at uses = max" }; } },
  { id: "FR09-BVA-15", feature: "FR-09", kind: "auto", expected: "Reject — uses 3 > max 2 (UB+1)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "fixed", value: 100000, min: 1000, expired_at: dateOffset(3650), max: 2 });
    await seedCouponUsage(ctx, c.id, 3);
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 500000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "accepted over limit" }; } },
  { id: "FR09-BVA-16", feature: "FR-09", kind: "auto", expected: "Reject — expired yesterday (C2, day-after cutoff)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "percent", value: 10, min: 1000, expired_at: dateOffset(-1), max: 1 });
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 200000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "expired coupon accepted" }; } },
  probe("FR09-BVA-17", "FR-09", "spec-undefined — coupon expiring today (same-day time-of-day)", async (ctx) => {
    const c = await makeTempCoupon(ctx, { type: "percent", value: 10, min: 1000, expired_at: dateOffset(0), max: 1 });
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 200000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass: null, reason: "record only" }; }),
  { id: "FR09-BVA-18", feature: "FR-09", kind: "auto", expected: "Apply — expires tomorrow, still valid (C2, day-before)", async run(ctx) {
    const c = await makeTempCoupon(ctx, { type: "percent", value: 10, min: 1000, expired_at: dateOffset(1), max: 1 });
    const r = await api("POST", "/api/apply-coupon", { body: { code: c.code, total_amount: 200000, user_id: ctx.ids.user } });
    return { actual: `status ${r.status}`, pass: r.status === 200, reason: r.status === 200 ? "" : "valid coupon rejected" }; } },
  couponReject("FR09-BVA-19", "Reject — far-past expiry (EXPIRED 2020, above min)", { code: "EXPIRED", total: 200000 }),
  couponReject("FR09-BVA-20", "Reject — total 0 (below min/invalid)", { code: "SAVE10", total: 0 }),
  probe("FR09-BVA-21", "FR-09", "spec-undefined — negative total (−1)", async (ctx) => {
    const r = await api("POST", "/api/apply-coupon", { body: { code: "SAVE10", total_amount: -1, user_id: ctx.ids.user } });
    return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass: null, reason: "record only" }; }),
  coupon("FR09-BVA-22", "Apply; discount = 999,999,999 (10% of 9,999,999,999) — probe overflow/formula", { code: "SAVE10", total: 9999999999, discount: 999999999, final: 9000000000 }),
];

// ============================ FR-14 — Category CRUD ===========================
const FR14 = [
  { id: "FR14-DT-01", feature: "FR-14", kind: "auto", expected: "Created; appears in GET list (FR-14 Add+View)", async run(ctx) {
    const name = "Đồng hồ thông minh " + Math.random().toString(36).slice(2, 6);
    const c = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name } });
    const l = await api("GET", "/api/categories");
    const pass = (c.status === 200 || c.status === 201) && (l.body ?? []).some((x) => x.name === name);
    return { actual: `create ${c.status}; in list ${(l.body ?? []).some((x) => x.name === name)}`, pass, reason: pass ? "" : "not created/listed" }; } },
  { id: "FR14-DT-02", feature: "FR-14", kind: "auto", expected: "Deleted; gone from list (FR-14 Delete)", async run(ctx) {
    const name = "DelMe " + Math.random().toString(36).slice(2, 6);
    const c = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name } });
    const id = c.body?.id;
    const d = await api("DELETE", `/api/categories/${id}`, { token: ctx.tokens.admin });
    const l = await api("GET", "/api/categories");
    const pass = d.status === 200 && !(l.body ?? []).some((x) => x.id === id);
    return { actual: `delete ${d.status}`, pass, reason: pass ? "" : "still present" }; } },
  cat("FR14-DT-03", "Reject — name required, not empty (FR-14)", { name: "", actor: "admin", expect: "reject" }),
  cat("FR14-DT-04", "Reject — whitespace-only = empty (FR-14)", { name: "   ", actor: "admin", expect: "reject" }),
  cat("FR14-DT-05", "Reject 403 — non-admin cannot create (FR-12/SEC-03)", { name: "Hợp lệ", actor: "user", expect: 403 }),
  cat("FR14-DT-06", "Reject 401 — token required (SEC-02/FR-12)", { name: "Hợp lệ", actor: "none", expect: 401 }),
  { id: "FR14-DT-07", feature: "FR-14", kind: "auto", expected: "Reject 403 — non-admin delete (SEC-03)", async run(ctx) {
    const r = await api("DELETE", "/api/categories/2", { token: ctx.tokens.user });
    return { actual: `status ${r.status}`, pass: r.status === 403, reason: r.status === 403 ? "" : `got ${r.status}` }; } },
  probe("FR14-DT-08", "FR-14", "spec: reject/no-op on non-existent id 9999 (no-op vs error undefined)", async (ctx) => {
    const r = await api("DELETE", "/api/categories/9999", { token: ctx.tokens.admin });
    return { actual: `status ${r.status} ${JSON.stringify(r.body)}`, pass: null, reason: "record only" }; }),
  manual("FR14-DT-09", "FR-14", "Category name with <script> escaped on display, not executed (SEC-04)",
    "Admin create name `<script>alert(1)</script>`; view anywhere the category renders; confirm escaped, no alert."),
  { id: "FR14-DT-10", feature: "FR-14", kind: "auto", expected: "Categories table intact after SQL-meta name (SEC-05)", async run(ctx) {
    await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "'); DROP TABLE categories;--" } });
    const l = await api("GET", "/api/categories");
    const pass = (l.body ?? []).length > 0; return { actual: `${(l.body ?? []).length} categories`, pass, reason: pass ? "" : "table missing" }; } },
  probe("FR14-DT-11", "FR-14", "spec-undefined — duplicate name 'Laptop'", async (ctx) => {
    const r = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "Laptop" } });
    return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  probe("FR14-DT-12", "FR-14", "spec-undefined — delete category id=1 that has products (integrity)", async (ctx) => {
    const r = await api("DELETE", "/api/categories/1", { token: ctx.tokens.admin });
    return { actual: `status ${r.status}`, pass: null, reason: "record only; check orphaned products" }; }),
  probe("FR14-DT-13", "FR-14", "spec-undefined — numeric-only name '12345'", async (ctx) => {
    const r = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "12345" } });
    return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  cat("FR14-DT-14", "Reject 403 — auth checked before validation (empty name × non-admin)", { name: "", actor: "user", expect: 403 }),

  cat("FR14-BVA-01", "Reject — length 0 empty (FR-14)", { name: "", actor: "admin", expect: "reject" }),
  cat("FR14-BVA-02", "Accept — length 1 non-empty (FR-14)", { name: "A", actor: "admin", expect: "ok" }),
  cat("FR14-BVA-03", "Accept — length 2 (FR-14)", { name: "AB", actor: "admin", expect: "ok" }),
  cat("FR14-BVA-04", "Reject — single space trims to empty (FR-14)", { name: " ", actor: "admin", expect: "reject" }),
  probe("FR14-BVA-05", "FR-14", "spec-undefined — 255-char name (no max stated)", async (ctx) => {
    const r = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "A".repeat(255) } });
    return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  probe("FR14-BVA-06", "FR-14", "spec-undefined — 256-char name", async (ctx) => {
    const r = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "A".repeat(256) } });
    return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  { id: "FR14-BVA-07", feature: "FR-14", kind: "auto", expected: "Graceful, no crash on 10 000-char name", async run(ctx) {
    const r = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "A".repeat(10000) } });
    return { actual: `status ${r.status}`, pass: r.status < 500, reason: r.status < 500 ? "" : "server error" }; } },
  { id: "FR14-BVA-08", feature: "FR-14", kind: "auto", expected: "Delete existing min id succeeds (FR-14)", async run(ctx) {
    const c = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "MinDel " + Math.random().toString(36).slice(2, 6) } });
    const r = await api("DELETE", `/api/categories/${c.body?.id}`, { token: ctx.tokens.admin });
    return { actual: `status ${r.status}`, pass: r.status === 200, reason: r.status === 200 ? "" : "delete failed" }; } },
  probe("FR14-BVA-09", "FR-14", "spec: id 0 (LB−1) reject/no-op", async (ctx) => {
    const r = await api("DELETE", "/api/categories/0", { token: ctx.tokens.admin }); return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  probe("FR14-BVA-10", "FR-14", "spec: id −1 (negative) reject/no-op", async (ctx) => {
    const r = await api("DELETE", "/api/categories/-1", { token: ctx.tokens.admin }); return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  { id: "FR14-BVA-11", feature: "FR-14", kind: "auto", expected: "Delete existing max id succeeds (FR-14)", async run(ctx) {
    const c = await api("POST", "/api/categories", { token: ctx.tokens.admin, body: { name: "MaxDel " + Math.random().toString(36).slice(2, 6) } });
    const r = await api("DELETE", `/api/categories/${c.body?.id}`, { token: ctx.tokens.admin });
    return { actual: `status ${r.status}`, pass: r.status === 200, reason: r.status === 200 ? "" : "delete failed" }; } },
  probe("FR14-BVA-12", "FR-14", "spec: id just past max (UB+1) not found/no-op", async (ctx) => {
    const r = await api("DELETE", "/api/categories/999998", { token: ctx.tokens.admin }); return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  probe("FR14-BVA-13", "FR-14", "spec: id far above range no-op", async (ctx) => {
    const r = await api("DELETE", "/api/categories/9999999", { token: ctx.tokens.admin }); return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
  probe("FR14-BVA-14", "FR-14", "spec-undefined — non-numeric id 'abc'", async (ctx) => {
    const r = await api("DELETE", "/api/categories/abc", { token: ctx.tokens.admin }); return { actual: `status ${r.status}`, pass: null, reason: "record only" }; }),
];

// ============================ FR-10 (Mobile) — cancellation ===================
const FR10 = [
  manual("FR10-DT-01", "FR-10", "pending: red 'Hủy đơn' shown; tap → success → 'Đã hủy' (FR-10/20/21)", "Mobile: on a pending order, confirm red cancel button, tap it, confirm success + label 'Đã hủy'."),
  manual("FR10-DT-02", "FR-10", "confirmed: cancel button shown; tap → canceled (FR-10/20)", "Mobile: drive an order to confirmed (admin), confirm button shown, tap, confirm canceled."),
  manual("FR10-DT-03", "FR-10", "Empty history: 'Bạn chưa có đơn hàng nào.' (FR-24)", "Mobile: log in as a user with no orders; confirm the empty-state message."),
  manual("FR10-DT-04", "FR-10", "shipping: NO cancel button (L1, FR-20)", "Mobile: order in shipping; confirm 'Hủy đơn' button is NOT rendered."),
  manual("FR10-DT-05", "FR-10", "delivered: NO cancel button (L1, final)", "Mobile: order delivered; confirm no cancel button."),
  manual("FR10-DT-06", "FR-10", "canceled: NO cancel button (L1, final)", "Mobile: order canceled; confirm no cancel button."),
  cancel("FR10-DT-07", "FR-10", "Reject 4xx — user cannot cancel a shipping order via API (L2, FR-10)", "shipping", { reject: true }),
  cancel("FR10-DT-08", "FR-10", "Reject — cancel delivered (L2, final)", "delivered", { reject: true }),
  cancel("FR10-DT-09", "FR-10", "Reject — cancel canceled (L2, final)", "canceled", { reject: true }),
  { id: "FR10-DT-10", feature: "FR-10", kind: "auto", expected: "Reject — cannot cancel another user's order (FR-11)", async run(ctx) {
    const id = await makeForeignOrder(ctx);
    const r = await api("PUT", `/api/orders/${id}/cancel`, { token: ctx.tokens.user });
    return { actual: `status ${r.status}`, pass: r.status >= 400, reason: r.status >= 400 ? "" : "cancelled another user's order" }; } },
  manual("FR10-DT-11", "FR-10", "L1↔L2 consistency at shipping (button hidden AND API rejects)", "Compare FR10-DT-04 (button hidden) with FR10-DT-07 (API reject). Both must hold; hidden button + API accept ⇒ UI masks a server defect."),
  manual("FR10-DT-12", "FR-10", "VN status labels for all 5 states (FR-21)", "Mobile: view one order per state; confirm each shows the correct Vietnamese label, not a raw enum."),
  manual("FR10-DT-13", "FR-10", "Offline cancel: error Alert, order unchanged, no crash", "Mobile: with backend unreachable, tap 'Hủy đơn'; confirm error Alert and no crash."),
  probe("FR10-DT-14", "FR-10", "spec-ambiguous — any device path to cancel a shipping order?", async (ctx) => {
    const id = await makeOrder(ctx, "shipping");
    const r = await api("PUT", `/api/orders/${id}/cancel`, { token: ctx.tokens.user });
    return { actual: `status ${r.status}`, pass: null, reason: "record: mobile has no admin path; report diagram/text conflict" }; }),

  manual("FR10-BVA-01", "FR-10", "pending (LB−1): cancel button shown (L1)", "Mobile: pending order → button shown."),
  cancel("FR10-BVA-02", "FR-10", "pending (LB−1): PUT /cancel → 200 canceled (L2)", "pending", { reject: false }),
  manual("FR10-BVA-03", "FR-10", "confirmed (LB): cancel button shown (L1)", "Mobile: confirmed order → button shown."),
  cancel("FR10-BVA-04", "FR-10", "confirmed (LB): PUT /cancel → 200 canceled (L2)", "confirmed", { reject: false }),
  manual("FR10-BVA-05", "FR-10", "shipping (LB+1): cancel button hidden (L1)", "Mobile: shipping order → button hidden."),
  cancel("FR10-BVA-06", "FR-10", "shipping (LB+1): PUT /cancel → reject 4xx (L2, KEY — masked bug)", "shipping", { reject: true }),
  manual("FR10-BVA-07", "FR-10", "delivered (LB+2): cancel button hidden (L1, final)", "Mobile: delivered order → button hidden."),
  cancel("FR10-BVA-08", "FR-10", "delivered (LB+2): PUT /cancel → reject (L2, final)", "delivered", { reject: true }),
  cancel("FR10-BVA-09", "FR-10", "delivered terminal: PUT /cancel → reject (B2 on-edge)", "delivered", { reject: true }),
  cancel("FR10-BVA-10", "FR-10", "canceled terminal: PUT /cancel → reject (B2 on-edge)", "canceled", { reject: true }),
];

export const cases = [...FR05, ...FR09, ...FR14, ...FR10];
