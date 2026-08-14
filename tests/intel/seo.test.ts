import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertSearchMetrics,
  getSeoPerformance,
  getTopPages,
  getTopQueries,
  comparePeriods,
  evaluateSeoSignals,
  generateRecommendationsFromSignals,
  listRecommendations,
} from "../../lib/intel";

const PROP = "sc-domain:test.seo";
const AS_OF = "2026-08-30T00:00:00.000Z"; // windows: latest 08-23..29, previous 08-16..22
const PAGE = "https://leads.eseeent.com/carpet-removal-augusta-ga";
const QUERY = "junk removal augusta ga"; // commercial (junk/removal), not branded

function seedMetrics() {
  upsertSearchMetrics(PROP, [{ date: "2026-08-25", page: PAGE, query: QUERY, clicks: 2, impressions: 500, ctr: 0.004, position: 8 }], AS_OF);
  upsertSearchMetrics(PROP, [{ date: "2026-08-18", page: PAGE, query: QUERY, clicks: 5, impressions: 100, ctr: 0.05, position: 12 }], AS_OF);
}

test("SEO baseline aggregates the latest window; GSC = observed performance", () => {
  seedMetrics();
  const perf = getSeoPerformance(7, AS_OF);
  assert.equal(perf.window.days, 7);
  assert.equal(perf.totals.impressions, 500); // latest window only
  assert.equal(perf.totals.clicks, 2);
  assert.ok(Math.abs((perf.totals.ctr ?? 0) - 0.004) < 1e-9);
  assert.equal(perf.hasData, true);
});

test("top pages map to the SEO registry; queries are classified", () => {
  seedMetrics();
  const pages = getTopPages(7, 10, AS_OF);
  const row = pages.find((p) => p.path === PAGE);
  assert.ok(row);
  assert.equal(row!.impressions, 500);
  assert.equal(row!.published, true);
  assert.equal(row!.citySlug, "augusta-ga");
  assert.equal(row!.nicheSlug, "carpet-removal");

  const queries = getTopQueries(7, 10, AS_OF);
  const q = queries.find((x) => x.key === QUERY);
  assert.ok(q);
  assert.equal(q!.commercial, true);
  assert.equal(q!.branded, false);
});

test("comparison window computes deltas and min-data flag", () => {
  seedMetrics();
  const cmp = comparePeriods("page", 7, AS_OF).find((c) => c.key === PAGE);
  assert.ok(cmp);
  assert.equal(cmp!.latest.impressions, 500);
  assert.equal(cmp!.previous.impressions, 100);
  assert.ok(Math.abs((cmp!.impressionsPct ?? 0) - 4.0) < 1e-9); // +400%
  assert.ok((cmp!.positionDelta ?? 0) < 0); // 8 - 12 = -4 → improved
  assert.equal(cmp!.meetsMinData, true);
});

test("SEO signals are SUPPRESSED when Search Console is not connected", () => {
  seedMetrics();
  const res = evaluateSeoSignals({ now: AS_OF, comparisonDays: 7 });
  assert.equal(res.connection, "NOT_CONNECTED");
  assert.equal(res.created.length, 0);
  assert.ok(res.skipped.length > 0);
});

test("SEO signals fire deterministically when connected; recommendations dedup", () => {
  seedMetrics();
  const prevSite = process.env.GSC_SITE_URL;
  const prevSa = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  try {
    // Mark connected (analytics read the store directly; no API call is made).
    process.env.GSC_SITE_URL = PROP;
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "x@y.iam", private_key: "k" });

    const res = evaluateSeoSignals({ now: AS_OF, comparisonDays: 7 });
    assert.equal(res.connection, "CONNECTED");
    assert.equal(res.skipped.length, 0);
    const types = new Set(res.created.map((s) => s.signal_type));
    assert.ok(types.has("HIGH_IMPRESSIONS_LOW_CTR"));
    assert.ok(types.has("PAGE_GAINING_VISIBILITY"));
    assert.ok(types.has("POSITION_IMPROVING"));
    assert.ok(types.has("COMMERCIAL_QUERY_POSITION_5_15"));

    const g1 = generateRecommendationsFromSignals();
    assert.ok(g1.created.some((r) => r.type === "OPTIMIZE_PAGE_METADATA"));
    const count1 = listRecommendations().length;
    generateRecommendationsFromSignals(); // re-run
    const count2 = listRecommendations().length;
    assert.equal(count1, count2); // deduped, no spam
  } finally {
    if (prevSite === undefined) delete process.env.GSC_SITE_URL;
    else process.env.GSC_SITE_URL = prevSite;
    if (prevSa === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = prevSa;
  }
});
