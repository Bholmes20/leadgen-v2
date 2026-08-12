import "./_setup";
import { insertLead, clearLeads } from "./_fixtures";
import test from "node:test";
import assert from "node:assert/strict";
import { upsertMarket, upsertNiche, getLeadPerformance } from "../../lib/intel";

test("lead performance aggregates real leads with honest provenance", () => {
  clearLeads();
  upsertMarket({ city: "Augusta", state: "GA", seo_city_slug: "augusta-ga" });
  upsertNiche({ slug: "carpet-removal", label: "Carpet Removal" });

  // 4 attributed to Augusta, mixed statuses; 1 fully unattributed.
  insertLead({ city: "augusta-ga", niche: "carpet-removal", source_page: "/carpet-removal-augusta-ga", status: "NEW" });
  insertLead({ city: "augusta-ga", niche: "carpet-removal", status: "ROUTED", last_contacted_at: "2026-08-01 11:00:00", created_at: "2026-08-01 09:00:00" });
  insertLead({ city: "augusta-ga", niche: "carpet-removal", status: "QUOTED" });
  insertLead({ city: "augusta-ga", niche: "carpet-removal", status: "WON" });
  insertLead({}); // unattributed

  const p = getLeadPerformance();
  assert.equal(p.totalLeads, 5);

  // Buckets: NEW→new, ROUTED→contacted, QUOTED→quoted, WON→won, (unattributed NEW)→new
  assert.equal(p.byBucket.new, 2);
  assert.equal(p.byBucket.contacted, 1);
  assert.equal(p.byBucket.quoted, 1);
  assert.equal(p.byBucket.won, 1);

  // Conversion rates are DERIVED. contacted-or-further = contacted+quoted+won = 3.
  assert.equal(p.conversion.contactRate.quality, "DERIVED");
  assert.equal(p.conversion.contactRate.value, 3 / 5);
  assert.equal(p.conversion.winRate.value, 1 / 5);

  // Qualification and revenue are UNKNOWN — never fabricated.
  assert.equal(p.qualified.quality, "UNKNOWN");
  assert.equal(p.revenue.quality, "UNKNOWN");

  // Attribution visibility.
  assert.equal(p.unattributedLeads, 1);

  // Time-to-contact DERIVED from the single lead with last_contacted_at (2h).
  assert.equal(p.timeToContact.quality, "DERIVED");
  assert.ok(Math.abs((p.timeToContact.value ?? 0) - 2) < 0.001);
});

test("time-to-contact is UNKNOWN when no lead has been contacted", () => {
  clearLeads();
  insertLead({ city: "augusta-ga" });
  const p = getLeadPerformance();
  assert.equal(p.timeToContact.quality, "UNKNOWN");
  assert.equal(p.timeToContact.value, null);
});

test("filters scope the aggregation by market and page", () => {
  clearLeads();
  insertLead({ city: "augusta-ga", source_page: "/carpet-removal-augusta-ga" });
  insertLead({ city: "augusta-ga", source_page: "/carpet-removal-augusta-ga" });
  insertLead({ city: "evans-ga", source_page: "/rental-property-cleanout-evans-ga" });

  assert.equal(getLeadPerformance({ market: "augusta-ga" }).totalLeads, 2);
  assert.equal(getLeadPerformance({ market: "evans-ga" }).totalLeads, 1);
  // Page filter matches with or without the stored leading slash.
  assert.equal(getLeadPerformance({ page: "carpet-removal-augusta-ga" }).totalLeads, 2);
  assert.equal(getLeadPerformance({ page: "/carpet-removal-augusta-ga" }).totalLeads, 2);
});

test("unmapped city leads are counted, not discarded", () => {
  clearLeads();
  // A city slug with no matching intel market.
  insertLead({ city: "ghost-town-zz" });
  const p = getLeadPerformance();
  assert.equal(p.totalLeads, 1);
  assert.equal(p.unmappedCityLeads, 1);
  assert.equal(p.byCity.find((d) => d.identifier === "ghost-town-zz")?.mapped, false);
});
