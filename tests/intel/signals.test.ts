import "./_setup";
import { insertLead, clearLeads } from "./_fixtures";
import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGrowthSignals,
  generateRecommendationsFromSignals,
  listSignals,
} from "../../lib/intel";

test("thin data → INSUFFICIENT_DATA, and GSC/GA4 signals are SUPPRESSED not faked", () => {
  clearLeads();
  insertLead({ city: "augusta-ga" });

  const evalResult = evaluateGrowthSignals({ now: "2026-08-12T00:00:00.000Z" });

  // INSUFFICIENT_DATA fires deterministically below the volume threshold.
  assert.ok(evalResult.created.some((s) => s.signal_type === "INSUFFICIENT_DATA"));

  // Signals that require unavailable integrations are reported as skipped.
  const skippedTypes = evalResult.skipped.map((s) => s.signal_type);
  assert.ok(skippedTypes.includes("HIGH_IMPRESSIONS_LOW_CTR"));
  assert.ok(skippedTypes.includes("TRAFFIC_WITH_LOW_LEAD_CONVERSION"));
  // None of the suppressed signal types were actually created.
  assert.ok(!evalResult.created.some((s) => s.signal_type === "HIGH_IMPRESSIONS_LOW_CTR"));
});

test("unattributed leads produce a MEASURED UNMAPPED_LEAD_ATTRIBUTION signal", () => {
  clearLeads();
  for (let i = 0; i < 5; i++) insertLead({}); // all unattributed

  evaluateGrowthSignals({ now: "2026-08-12T00:00:00.000Z" });
  const open = listSignals("OPEN");
  const unmapped = open.find((s) => s.signal_type === "UNMAPPED_LEAD_ATTRIBUTION");
  assert.ok(unmapped, "expected an UNMAPPED_LEAD_ATTRIBUTION signal");
  assert.equal(unmapped!.data_quality, "MEASURED");
  assert.equal(unmapped!.scope, "attribution");
});

test("re-evaluation upserts signals instead of duplicating", () => {
  clearLeads();
  for (let i = 0; i < 5; i++) insertLead({});

  evaluateGrowthSignals({ now: "2026-08-12T00:00:00.000Z" });
  const firstCount = listSignals().length;
  evaluateGrowthSignals({ now: "2026-08-13T00:00:00.000Z" });
  const secondCount = listSignals().length;
  assert.equal(firstCount, secondCount); // deduped by dedup_key
});

test("signals convert to PROPOSED recommendations; INSUFFICIENT_DATA yields none", () => {
  clearLeads();
  for (let i = 0; i < 5; i++) insertLead({});

  evaluateGrowthSignals({ now: "2026-08-12T00:00:00.000Z" });
  const gen = generateRecommendationsFromSignals();

  // UNMAPPED_LEAD_ATTRIBUTION → FIX_ATTRIBUTION recommendation.
  assert.ok(gen.created.some((r) => r.type === "FIX_ATTRIBUTION"));
  // INSUFFICIENT_DATA has no action mapping and is reported as skipped.
  assert.ok(gen.skippedTypes.includes("INSUFFICIENT_DATA"));
});
