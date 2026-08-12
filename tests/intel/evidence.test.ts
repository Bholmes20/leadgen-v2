import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  discoverOpportunity,
  recordEvidence,
  resolveFactors,
} from "../../lib/intel";

function opp() {
  const s = `${Math.round(Math.random() * 1e9)}`;
  const m = upsertMarket({ city: `E${s}`, state: "SC" });
  const n = upsertNiche({ slug: `en-${s}`, label: "Ev" });
  return discoverOpportunity(m.id, n.id);
}

test("resolveFactors returns latest value per factor with its evidence kind", () => {
  const o = opp();
  recordEvidence({
    opportunity_id: o.id,
    factor_key: "search_demand",
    value_num: 40,
    kind: "ESTIMATE",
    observed_at: "2026-01-01T00:00:00.000Z",
  });
  recordEvidence({
    opportunity_id: o.id,
    factor_key: "search_demand",
    value_num: 65,
    kind: "FACT",
    observed_at: "2026-06-01T00:00:00.000Z",
  });
  const f = resolveFactors(o.id, "2026-08-01T00:00:00.000Z");
  assert.equal(f.search_demand?.value, 65); // newest wins
  assert.equal(f.search_demand?.kind, "FACT");
});

test("stale evidence (fresh_until in the past) is dropped", () => {
  const o = opp();
  recordEvidence({
    opportunity_id: o.id,
    factor_key: "ticket_size_usd",
    value_num: 500,
    kind: "FACT",
    observed_at: "2026-01-01T00:00:00.000Z",
    fresh_until: "2026-02-01T00:00:00.000Z",
  });
  const f = resolveFactors(o.id, "2026-08-01T00:00:00.000Z");
  assert.equal(f.ticket_size_usd, undefined);
});

test("unknown factor keys the scorer does not understand are excluded", () => {
  const o = opp();
  recordEvidence({ opportunity_id: o.id, factor_key: "made_up_key", value_num: 99, kind: "FACT" });
  const f = resolveFactors(o.id);
  assert.equal(f.made_up_key, undefined);
});

test("an invalid evidence kind is coerced to UNKNOWN (never trusted)", () => {
  const o = opp();
  // @ts-expect-error deliberately passing a bad kind to prove coercion
  const ev = recordEvidence({ opportunity_id: o.id, factor_key: "seo_difficulty", value_num: 30, kind: "BOGUS" });
  assert.equal(ev.kind, "UNKNOWN");
});
