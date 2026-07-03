// EShop test runner — executes cases.mjs against the live backend and writes results.json.
// Consumed by the run-tests-and-report skill. See tests/README.md.
import { writeFileSync } from "node:fs";
import { makeContext } from "./harness.mjs";
import { cases } from "./cases.mjs";

const only = process.env.ESHOP_FEATURE; // optional: run one feature, e.g. FR-09
const ctx = await makeContext();
const results = [];

for (const c of cases) {
  if (only && c.feature !== only) continue;
  if (c.kind === "manual") {
    results.push({ id: c.id, feature: c.feature, kind: "manual", expected: c.expected,
      actual: "(manual)", status: "MANUAL", reason: c.steps ?? "" });
    continue;
  }
  try {
    const r = await c.run(ctx);
    const status = c.kind === "probe" ? "PROBE" : (r.pass ? "PASS" : "FAIL");
    results.push({ id: c.id, feature: c.feature, kind: c.kind, expected: c.expected,
      actual: r.actual, status, reason: r.reason });
  } catch (e) {
    results.push({ id: c.id, feature: c.feature, kind: c.kind, expected: c.expected,
      actual: "ERROR", status: "ERROR", reason: String(e?.message ?? e) });
  }
}

writeFileSync("tests/results.json", JSON.stringify({ when: new Date().toISOString(), base: process.env.ESHOP_API ?? "http://localhost:3000", results }, null, 2));

const n = (s) => results.filter((r) => r.status === s).length;
console.log(`\nTotal ${results.length}  |  PASS ${n("PASS")}  FAIL ${n("FAIL")}  MANUAL ${n("MANUAL")}  PROBE ${n("PROBE")}  ERROR ${n("ERROR")}`);
for (const f of ["FR-05", "FR-09", "FR-14", "FR-10"]) {
  const g = results.filter((r) => r.feature === f);
  if (!g.length) continue;
  const c = (s) => g.filter((r) => r.status === s).length;
  console.log(`  ${f}: PASS ${c("PASS")} FAIL ${c("FAIL")} MANUAL ${c("MANUAL")} PROBE ${c("PROBE")} ERROR ${c("ERROR")}`);
}
console.log("\nWrote tests/results.json — hand to the run-tests-and-report skill for docs/test-results.md.");
console.log("Reminder: FAIL = candidate spec-violation bug on this SUT, not a broken test.");
