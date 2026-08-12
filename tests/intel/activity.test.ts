import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  discoverOpportunity,
  scoreOpportunityById,
  recordEvidence,
  createRecommendation,
  approveRecommendation,
  recordActivity,
  listRecentActivity,
  listActivityForOpportunity,
  getSystemStatus,
  ingestSearchConsole,
} from "../../lib/intel";

function freshOpp() {
  const s = `${Math.round(Math.random() * 1e9)}`;
  const m = upsertMarket({ city: `C${s}`, state: "GA" });
  const n = upsertNiche({ slug: `n-${s}`, label: "N" });
  return discoverOpportunity(m.id, n.id);
}

test("recordActivity persists and lists newest-first", () => {
  const before = listRecentActivity(100).length;
  recordActivity({ event_type: "APPROVAL_REQUIRED", title: "manual test event", severity: "notice" });
  const after = listRecentActivity(100);
  assert.equal(after.length, before + 1);
  assert.equal(after[0].title, "manual test event");
});

test("lifecycle functions emit activity events (discover, score, recommend, approve)", () => {
  const opp = freshOpp();
  // discoverOpportunity emitted OPPORTUNITY_DISCOVERED
  const oppEvents = listActivityForOpportunity(opp.id);
  assert.ok(oppEvents.some((e) => e.event_type === "OPPORTUNITY_DISCOVERED"));

  recordEvidence({ opportunity_id: opp.id, factor_key: "strategic_fit", value_num: 80, kind: "FACT" });
  scoreOpportunityById(opp.id, "2026-08-12T00:00:00.000Z");
  assert.ok(listActivityForOpportunity(opp.id).some((e) => e.event_type === "OPPORTUNITY_SCORED"));

  const rec = createRecommendation({ type: "OPTIMIZE_PAGE", target: "/some-page", reason: "test" });
  assert.ok(listRecentActivity(100).some((e) => e.event_type === "RECOMMENDATION_CREATED" && e.recommendation_id === rec.id));

  approveRecommendation(rec.id, "james", "ok");
  assert.ok(listRecentActivity(100).some((e) => e.event_type === "RECOMMENDATION_APPROVED" && e.recommendation_id === rec.id));
});

test("getSystemStatus reports honest connection states (no fabrication)", () => {
  const status = getSystemStatus("2026-08-12T00:00:00.000Z");
  assert.equal(status.generatedAt, "2026-08-12T00:00:00.000Z");
  const gsc = status.integrations.find((i) => i.key === "gsc");
  assert.equal(gsc?.state, "NOT_CONNECTED");
  const leads = status.integrations.find((i) => i.key === "leads");
  assert.equal(leads?.state, "CONNECTED");
  const revenue = status.integrations.find((i) => i.key === "revenue");
  assert.equal(revenue?.state, "UNAVAILABLE");
});

test("Search Console ingestion is a clean NOT_CONNECTED no-op", async () => {
  const result = await ingestSearchConsole({ now: "2026-08-12T00:00:00.000Z" });
  assert.equal(result.status, "NOT_CONNECTED");
  assert.equal(result.rowsIngested, 0);
});
