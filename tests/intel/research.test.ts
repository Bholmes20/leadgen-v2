import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  createResearchTask,
  recordResearchEvidence,
  completeResearchDimension,
  getResearchTaskByOpportunity,
  missingDimensions,
  analyzeOpportunity,
  evidenceFreshness,
  defaultFreshUntil,
  generateOpportunityReport,
  getOpportunityReportRaw,
  getSEOInsights,
  KNOWN_FACTOR_KEYS,
} from "../../lib/intel";

let seq = 0;
function freshOppTask() {
  seq += 1;
  const m = upsertMarket({ city: `RC${seq}`, state: "GA" });
  const n = upsertNiche({ slug: `rn-${seq}`, label: "N" });
  return createResearchTask({ marketId: m.id, nicheId: n.id });
}

test("defaultFreshUntil applies the per-factor policy; stale evidence is flagged", () => {
  const task = freshOppTask();
  const opp = task.opportunity_id;
  // Observed long ago with an explicit short freshness → STALE by asOf.
  recordResearchEvidence({
    opportunity_id: opp,
    factor_key: "search_demand",
    value_num: 60,
    kind: "FACT",
    observed_at: "2026-01-01T00:00:00.000Z",
    fresh_until: "2026-02-01T00:00:00.000Z",
    actor: "tester",
  });
  const fr = evidenceFreshness(opp, "2026-08-12T00:00:00.000Z");
  assert.equal(fr.factors.find((f) => f.factor_key === "search_demand")?.state, "STALE");
  assert.ok(fr.missing > 0); // other factors have no evidence

  // Policy: search_demand stays fresh 30 days.
  assert.equal(defaultFreshUntil("search_demand", "2026-08-12T00:00:00.000Z").slice(0, 10), "2026-09-11");
});

test("research lifecycle: QUEUED → IN_PROGRESS on evidence; dimension completion tracked", () => {
  const task = freshOppTask();
  assert.equal(task.status, "QUEUED");
  const opp = task.opportunity_id;

  recordResearchEvidence({ opportunity_id: opp, factor_key: "search_demand", value_num: 55, kind: "FACT" });
  const t1 = getResearchTaskByOpportunity(opp)!;
  assert.equal(t1.status, "IN_PROGRESS");
  assert.equal(t1.evidence_count, 1);

  completeResearchDimension(opp, "demand");
  const t2 = getResearchTaskByOpportunity(opp)!;
  assert.ok(missingDimensions(t2).includes("competition"));
  assert.ok(!missingDimensions(t2).includes("demand"));
});

test("Scoring V2 keeps opportunity score separate from evidence confidence", () => {
  const task = freshOppTask();
  const opp = task.opportunity_id;
  recordResearchEvidence({ opportunity_id: opp, factor_key: "strategic_fit", value_num: 90, kind: "FACT", fresh_until: "2027-01-01T00:00:00.000Z" });
  const a = analyzeOpportunity(opp, "2026-08-12T00:00:00.000Z");
  // Score exists (attractiveness) but research is not complete → low confidence.
  assert.notEqual(a.score, null);
  assert.equal(a.researchComplete, false);
  assert.ok(a.evidenceConfidence < 40); // one factor of sixteen
  assert.equal(a.totalDimensions, 6);
});

test("Opportunity Report is RESEARCH_INCOMPLETE until enough real evidence exists", () => {
  freshOppTask(); // at least one candidate with essentially no evidence
  const rep = generateOpportunityReport({ minReadyForRanking: 15, asOf: "2026-08-12T00:00:00.000Z" });
  assert.equal(rep.status, "RESEARCH_INCOMPLETE");
  assert.ok(rep.rows.length > 0); // progress view still returned
  assert.equal(rep.top5.length, 0); // no fake ranking
  assert.equal(rep.challenger, null);
});

test("Opportunity Report becomes READY with fully-researched evidence; picks a non-baseline challenger", () => {
  const m = upsertMarket({ city: "Thomson", state: "GA" });
  const n = upsertNiche({ slug: "challenger-niche", label: "Challenger" });
  const task = createResearchTask({ marketId: m.id, nicheId: n.id });
  const opp = task.opportunity_id;
  for (const key of KNOWN_FACTOR_KEYS) {
    recordResearchEvidence({
      opportunity_id: opp,
      factor_key: key,
      value_num: 70,
      kind: "FACT",
      observed_at: "2026-08-12T00:00:00.000Z",
      fresh_until: "2027-06-01T00:00:00.000Z",
    });
  }
  const a = analyzeOpportunity(opp, "2026-08-12T00:00:00.000Z");
  assert.equal(a.researchComplete, true);
  assert.notEqual(a.score, null);

  const rep = generateOpportunityReport({ minReadyForRanking: 1, asOf: "2026-08-12T00:00:00.000Z", baselineCity: "Augusta" });
  assert.equal(rep.status, "READY");
  assert.ok(rep.top5.length >= 1);
  assert.ok(rep.challenger);
  assert.ok(rep.challenger!.market.startsWith("Thomson"));
});

test("per-opportunity report bundles score/evidence/reasons and is honest about SEO connection", () => {
  const m = upsertMarket({ city: "Aiken", state: "SC" });
  const n = upsertNiche({ slug: "estate-cleanouts", label: "Estate Cleanouts" });
  const task = createResearchTask({ marketId: m.id, nicheId: n.id });
  const opp = task.opportunity_id;
  recordResearchEvidence({
    opportunity_id: opp,
    factor_key: "search_demand",
    value_num: 72,
    kind: "FACT",
    source_url: "https://example.test/demand",
    observed_at: "2026-08-12T00:00:00.000Z",
    fresh_until: "2026-12-01T00:00:00.000Z",
  });

  const r = getOpportunityReportRaw(opp, { asOf: "2026-08-12T00:00:00.000Z" });
  assert.equal(r.market, "Aiken, SC");
  assert.equal(r.niche, "Estate Cleanouts");
  // Score (attractiveness) and evidence confidence are reported separately.
  assert.notEqual(r.opportunityScore, null);
  assert.ok(r.evidenceConfidence >= 0 && r.evidenceConfidence <= 100);
  assert.ok(typeof r.evidenceConfidenceLabel === "string");
  // Provenance-first evidence is present with its source and freshness.
  const ev = r.evidence.find((e) => e.factor_key === "search_demand");
  assert.ok(ev);
  assert.equal(ev!.kind, "FACT");
  assert.equal(ev!.stale, false);
  assert.equal(ev!.source_url, "https://example.test/demand");
  // Missing evidence surfaced (15 of 16 factors unresearched), reasons are facts.
  assert.ok(r.missingEvidence.length > 0);
  assert.ok(Array.isArray(r.reasons));
  // SEO is NOT_CONNECTED and never fabricated.
  assert.equal(r.seo.connection, "NOT_CONNECTED");
  assert.equal(r.seo.hasData, false);
  assert.deepEqual(r.seo.pages, []);
  // Leads attribution is measured (none for this fresh market/niche).
  assert.equal(r.leads.attributedLeads, 0);
});

test("getSEOInsights is honest when Search Console is not connected", () => {
  const s = getSEOInsights(28);
  assert.equal(s.connection, "NOT_CONNECTED");
  assert.deepEqual(s.topPages, []);
  assert.deepEqual(s.topQueries, []);
  assert.equal(s.performance.hasData, false);
});
