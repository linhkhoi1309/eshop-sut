// EShop test harness — dependency-free (Node 18+ built-in fetch).
// Helpers + fixtures used by cases.mjs. See tests/README.md.
import { execSync } from "node:child_process";

export const BASE = process.env.ESHOP_API ?? "http://localhost:3000";
export const uid = () => Math.random().toString(36).slice(2, 8);

export async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, body: data };
}

export async function login(email, password) {
  const r = await api("POST", "/api/login", { body: { email, password } });
  if (r.status !== 200 || !r.body?.token) throw new Error(`login failed for ${email}: ${r.status}`);
  return { token: r.body.token, user: r.body.user };
}

// DESTRUCTIVE: drops + reseeds the SQLite DB. Guarded behind an env flag; note that
// backend/server.js also reseeds on boot, so a fresh `node server.js` ≈ a clean DB.
export function resetDb() {
  if (process.env.ESHOP_ALLOW_DB_RESET !== "1")
    return { skipped: true, reason: "set ESHOP_ALLOW_DB_RESET=1 to enable" };
  execSync("node database.js", { cwd: "backend", stdio: "ignore" });
  return { ok: true };
}

export async function makeContext() {
  const admin = await login("admin@eshop.com", "Admin123!");
  const user = await login("test@eshop.com", "Test1234!");
  return {
    api, resetDb,
    tokens: { admin: admin.token, user: user.token },
    ids: { user: user.user?.id ?? 2 },
  };
}

// ---- Fixtures ----------------------------------------------------------------

export async function checkout(token, total = 100000) {
  const r = await api("POST", "/api/checkout", {
    token, body: { total_amount: total, shipping_address: "Test 123, HCMC" },
  });
  return r.body?.orderId;
}

export async function setStatus(ctx, id, status) {
  return api("PUT", `/api/admin/orders/${id}/status`, { token: ctx.tokens.admin, body: { status } });
}

// Build an order in a target state via the admin API (mobile can't drive these).
export async function makeOrder(ctx, state = "pending") {
  const id = await checkout(ctx.tokens.user);
  if (state === "pending") return id;
  if (state === "canceled") { await setStatus(ctx, id, "canceled"); return id; }
  await setStatus(ctx, id, "confirmed");
  if (state === "confirmed") return id;
  await setStatus(ctx, id, "shipping");
  if (state === "shipping") return id;
  await setStatus(ctx, id, "delivered"); // delivered
  return id;
}

export async function registerAndLogin(email, password, name) {
  await api("POST", "/api/register", { body: { name, email, password } }); // ok if already exists
  return login(email, password);
}

// A pending order owned by a *different* user (for FR-11 ownership).
export async function makeForeignOrder(ctx) {
  const other = await registerAndLogin(`owner_${uid()}@eshop.com`, "Owner1234!", "Owner Two");
  const id = await checkout(other.token);
  return id;
}

// Create a throwaway coupon so usage/expiry boundaries are self-contained (no shared state).
export async function makeTempCoupon(ctx, { type = "percent", value = 10, min = 1000, expired_at, max = 1 }) {
  const code = `TMP${uid().toUpperCase()}`;
  const r = await api("POST", "/api/admin/coupons", {
    token: ctx.tokens.admin,
    body: { code, type, discount_value: value, min_order_amount: min, expired_at, max_uses_per_user: max },
  });
  return { code, id: r.body?.id };
}

export async function seedCouponUsage(ctx, couponId, n) {
  for (let i = 0; i < n; i++)
    await api("POST", "/api/coupon-usage", { token: ctx.tokens.user, body: { coupon_id: couponId } });
}

export function dateOffset(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
