import "./_setup";
import { insertLead, clearLeads } from "./_fixtures";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  discoverOpportunity,
  createExperiment,
  createRecommendation,
  buildPagePerformance,
  getPagePerformanceBySlug,
} from "../../lib/intel";

// A slug that is published in the lib/seo registry (Augusta flagship market).
const SLUG = "carpet-removal-augusta-ga";

test("page performance is registry-driven and joins real lead outcomes", () => {
  clearLeads();
  insertLead({ source_page: `/${SLUG}`, status: "NEW" });
  insertLead({ source_page: `/${SLUG}`, status: "WON" });

  const rows = buildPagePerformance();
  // Every published niche×city page and hub is present (reusable beyond Augusta).
  assert.ok(rows.length > 0);
  assert.ok(rows.some((r) => r.pageType === "city_hub"));
  assert.ok(rows.some((r) => r.pageType === "niche_hub"));

  const row = getPagePerformanceBySlug(SLUG);
  assert.ok(row, "expected the published Augusta carpet-removal page");
  assert.equal(row!.pageType, "page");
  assert.equal(row!.published, true);
  assert.equal(row!.leads, 2);
  assert.equal(row!.won, 1);
  // Search Console is not connected in tests → NOT_CONNECTED, no fabricated numbers.
  assert.equal(row!.search.status, "NOT_CONNECTED");
  assert.equal(row!.search.impressions, null);
  // Qualification stays UNKNOWN.
  assert.equal(row!.qualified.quality, "UNKNOWN");
});

test("recommendation and experiment counts attach to the right page", () => {
  clearLeads();
  createRecommendation({ type: "OPTIMIZE_PAGE", target: SLUG, reason: "test" });

  const m = upsertMarket({ city: "Augusta", state: "GA", seo_city_slug: "augusta-ga" });
  const n = upsertNiche({ slug: "carpet-removal", label: "Carpet Removal" });
  const opp = discoverOpportunity(m.id, n.id);
  createExperiment({ opportunity_id: opp.id, hypothesis: "seo test", channel: "seo", landing_pages: [SLUG] });

  const row = getPagePerformanceBySlug(SLUG);
  assert.ok(row);
  assert.equal(row!.recommendationCount, 1);
  assert.equal(row!.experimentCount, 1);
});
