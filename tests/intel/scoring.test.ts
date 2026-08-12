// Deterministic scoring tests — pure, no DB. These lock the scoring math so the
// model can't silently drift, and prove the "never imply precision we lack" rule.

import test from "node:test";
import assert from "node:assert/strict";
import { scoreOpportunity, FACTOR_SPECS, type FactorMap } from "../../lib/intel/scoring";

const fact = (value: number): FactorMap[string] => ({ value, kind: "FACT" });

test("single-factor demand: overall equals that component, thin coverage → low confidence", () => {
  const r = scoreOpportunity({ search_demand: fact(80) });
  assert.equal(r.components.demand, 80);
  assert.equal(r.components.competition, null);
  assert.equal(r.overall, 80);
  // 1 present of 16 specs → coverage 1/16 × FACT(1) = 6. Knowing almost nothing
  // must read as LOW confidence even though the one datum is a hard fact — and a
  // high score under low confidence must NOT read as "validate".
  assert.equal(r.totalFactorCount, FACTOR_SPECS.length);
  assert.equal(r.confidence, 6);
  assert.equal(r.confidenceLabel, "Low");
  assert.equal(r.verdict, "RESEARCH_MORE");
});

test("full coverage of hard FACTs → High confidence and a VALIDATE verdict", () => {
  const r = scoreOpportunity({
    search_demand: fact(90), keyword_breadth: fact(80), demand_trend: fact(70),
    competitor_count: fact(1), competitor_web_quality: fact(20),
    competitor_review_strength: fact(10), seo_difficulty: fact(20),
    ticket_size_usd: fact(900), gross_margin_pct: fact(70), recurring_potential: fact(60),
    contractor_availability: fact(90), fulfillment_radius_fit: fact(80), remote_quoting_suitability: fact(80),
    paid_difficulty: fact(20), organic_opportunity: fact(80),
    strategic_fit: fact(85),
  });
  assert.equal(r.presentFactorCount, 16);
  assert.equal(r.confidence, 100); // coverage 1 × FACT 1
  assert.equal(r.confidenceLabel, "High");
  assert.ok(r.overall !== null && r.overall >= 70);
  assert.equal(r.verdict, "VALIDATE");
});

test("full coverage of pure ESTIMATEs stays only moderate confidence", () => {
  const factors = Object.fromEntries(
    FACTOR_SPECS.map((s) => [s.key, { value: 50, kind: "ESTIMATE" as const }]),
  );
  const r = scoreOpportunity(factors);
  // coverage 1 × ESTIMATE 0.6 = 60 → Medium, never High. Estimates ≠ measurements.
  assert.equal(r.confidence, 60);
  assert.equal(r.confidenceLabel, "Medium");
});

test("competition advantage DROPS when competitors are strong (down-polarity)", () => {
  const strong = scoreOpportunity({
    competitor_count: fact(8),
    competitor_web_quality: fact(90),
    competitor_review_strength: fact(80),
    seo_difficulty: fact(100),
  });
  assert.equal(strong.components.competition, 13);

  const weak = scoreOpportunity({
    competitor_count: fact(1),
    competitor_web_quality: fact(20),
    competitor_review_strength: fact(10),
    seo_difficulty: fact(20),
  });
  assert.equal(weak.components.competition, 85);
  assert.ok(weak.components.competition! > strong.components.competition!);
});

test("economics uses weighted factors + ticket normalizer", () => {
  const r = scoreOpportunity({
    ticket_size_usd: fact(750), // → 50
    gross_margin_pct: fact(60), // → 60
    recurring_potential: fact(40), // weight 0.5 → 40
  });
  // (1*50 + 1*60 + 0.5*40) / 2.5 = 52
  assert.equal(r.components.economics, 52);
});

test("low-confidence evidence caps the verdict even when the score is high", () => {
  const r = scoreOpportunity({ search_demand: { value: 90, kind: "INFERENCE" } });
  assert.equal(r.overall, 90);
  assert.equal(r.confidenceLabel, "Low");
  // High score + Low confidence must NOT read as "validate".
  assert.equal(r.verdict, "RESEARCH_MORE");
});

test("empty factor set → overall null, RESEARCH_MORE, reasons still present", () => {
  const r = scoreOpportunity({});
  assert.equal(r.overall, null);
  assert.equal(r.verdict, "RESEARCH_MORE");
  assert.ok(r.reasons.length > 0);
  assert.equal(r.presentFactorCount, 0);
});

test("missing factors are surfaced, never invented", () => {
  const r = scoreOpportunity({ search_demand: fact(50) });
  const demand = r.componentDetail.find((d) => d.component === "demand")!;
  assert.deepEqual(demand.factorsUsed, ["search_demand"]);
  assert.ok(demand.missingFactors.includes("keyword_breadth"));
  assert.ok(demand.missingFactors.includes("demand_trend"));
});

test("determinism: same input → identical output", () => {
  const input: FactorMap = { search_demand: fact(70), ticket_size_usd: fact(600) };
  assert.deepEqual(scoreOpportunity(input), scoreOpportunity(input));
});

test("non-finite factor values are ignored (treated as missing)", () => {
  const r = scoreOpportunity({ search_demand: { value: NaN, kind: "FACT" } });
  assert.equal(r.components.demand, null);
  assert.equal(r.presentFactorCount, 0);
});
