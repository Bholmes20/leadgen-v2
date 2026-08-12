import "./_setup";
import test from "node:test";
import assert from "node:assert/strict";
import {
  upsertMarket,
  upsertNiche,
  resolveMarket,
  resolveNiche,
  mapLead,
  normalizeSlug,
} from "../../lib/intel";

test("normalizeSlug strips slashes and lowercases; empty → null", () => {
  assert.equal(normalizeSlug("/Rental-Property-Cleanout-Augusta-GA"), "rental-property-cleanout-augusta-ga");
  assert.equal(normalizeSlug("augusta-ga/"), "augusta-ga");
  assert.equal(normalizeSlug(""), null);
  assert.equal(normalizeSlug(null), null);
});

test("resolveMarket maps a seeded seo_city_slug and reports UNMAPPED otherwise", () => {
  upsertMarket({ city: "Augusta", state: "GA", seo_city_slug: "augusta-ga" });
  const hit = resolveMarket("augusta-ga");
  assert.equal(hit.mapped, true);
  assert.equal(hit.market?.city, "Augusta");

  const miss = resolveMarket("nowhere-zz");
  assert.equal(miss.mapped, false);
  assert.equal(miss.market, null);
  assert.equal(miss.citySlug, "nowhere-zz"); // slug preserved, not dropped
});

test("resolveNiche maps only exact slug matches; divergent slugs stay UNMAPPED", () => {
  upsertNiche({ slug: "carpet-removal", label: "Carpet Removal" });
  assert.equal(resolveNiche("carpet-removal").mapped, true);
  // lib/seo uses 'rental-property-cleanout'; the intel seed uses a different slug.
  const diverged = resolveNiche("rental-property-cleanout");
  assert.equal(diverged.mapped, false);
  assert.equal(diverged.nicheSlug, "rental-property-cleanout");
});

test("mapLead resolves full attribution and surfaces unmapped/unattributed leads", () => {
  upsertMarket({ city: "Augusta", state: "GA", seo_city_slug: "augusta-ga" });
  upsertNiche({ slug: "carpet-removal", label: "Carpet Removal" });

  const mapped = mapLead({
    city: "augusta-ga",
    niche: "carpet-removal",
    source_page: "/carpet-removal-augusta-ga",
  });
  assert.equal(mapped.marketMapped, true);
  assert.equal(mapped.nicheMapped, true);
  assert.equal(mapped.attributed, true);
  assert.equal(mapped.pageKind, "page"); // published in the SEO registry

  const partial = mapLead({ city: "augusta-ga", niche: "rental-property-cleanout" });
  assert.equal(partial.marketMapped, true);
  assert.equal(partial.nicheMapped, false); // divergent slug — visible, not forced
  assert.equal(partial.attributed, true);

  const none = mapLead({});
  assert.equal(none.attributed, false);
  assert.equal(none.market, null);
  assert.equal(none.niche, null);
});
