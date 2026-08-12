import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  discoverOpportunity,
  createExperiment,
  recordExperimentMetrics,
  summarizeExperiment,
  createRecommendation,
  listRecommendations,
  approveRecommendation,
  ApprovalRequiredError,
  buildWeeklyReport,
  generateGrowthRecommendations,
} from "../../lib/intel";

function opp() {
  const s = `${Math.round(Math.random() * 1e9)}`;
  const m = upsertMarket({ city: `S${s}`, state: "GA" });
  const n = upsertNiche({ slug: `sn-${s}`, label: "Svc" });
  return discoverOpportunity(m.id, n.id);
}

test("experiment summary computes derived economics; null denominators stay null", () => {
  const o = opp();
  const exp = createExperiment({ opportunity_id: o.id, hypothesis: "test", channel: "google_ads", test_budget: 50000 });
  recordExperimentMetrics({
    experiment_id: exp.id,
    as_of: "2026-08-01",
    source: "google_ads",
    qualified_leads: 10,
    booked_jobs: 2,
    revenue: 200000,
    contractor_cost: 80000,
    ad_spend: 40000,
  });
  const s = summarizeExperiment(exp.id);
  assert.equal(s.leads, 10);
  assert.equal(s.grossProfit, 200000 - 80000 - 40000);
  assert.equal(s.cpl, 4000); // 40000 / 10
  assert.equal(s.cac, 20000); // 40000 / 2
  assert.equal(s.conversionRate, 0.2);

  const empty = summarizeExperiment(createExperiment({ opportunity_id: o.id, hypothesis: "x", channel: "seo" }).id);
  assert.equal(empty.cpl, null);
  assert.equal(empty.cac, null);
  assert.equal(empty.hasData, false);
});

test("recommendation dedup_key upserts instead of duplicating", () => {
  const before = listRecommendations().length;
  createRecommendation({ type: "OPTIMIZE_PAGE", target: "/x", reason: "first", dedup_key: "OPTIMIZE_PAGE:/x" });
  createRecommendation({ type: "OPTIMIZE_PAGE", target: "/x", reason: "second", dedup_key: "OPTIMIZE_PAGE:/x" });
  const after = listRecommendations();
  assert.equal(after.length, before + 1);
  assert.equal(after.find((r) => r.dedup_key === "OPTIMIZE_PAGE:/x")!.reason, "second");
});

test("approving a recommendation is fail-closed without an approver", () => {
  const rec = createRecommendation({ type: "TEST_MARKET", target: "Thomson,GA", reason: "promising" });
  assert.throws(() => approveRecommendation(rec.id, ""), ApprovalRequiredError);
  const ok = approveRecommendation(rec.id, "james", "looks good");
  assert.equal(ok.status, "APPROVED");
  assert.equal(ok.approved_by, "james");
});

test("growth generator reports skipped patterns when integrations are unavailable", async () => {
  const analysis = await generateGrowthRecommendations();
  // GSC/GA4/Ads are unconfigured in tests → their patterns must be reported skipped, not run.
  assert.ok(analysis.skippedPatterns.length > 0);
  assert.ok(analysis.integrations.some((i) => i.source === "leads" && i.available));
  assert.ok(analysis.integrations.some((i) => i.source === "gsc" && !i.available));
});

test("weekly report builds with a stable timestamp and required sections", () => {
  const { json, text } = buildWeeklyReport("2026-08-11T00:00:00.000Z");
  assert.equal(json.generatedAt, "2026-08-11T00:00:00.000Z");
  assert.match(text, /ESEE GROWTH REPORT/);
  assert.match(text, /WHERE WE'RE WINNING/);
  assert.match(text, /APPROVALS NEEDED/);
  assert.match(text, /INTEGRATIONS \/ DATA COVERAGE/);
});
