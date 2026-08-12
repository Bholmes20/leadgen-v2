// Seed the Opportunity Intelligence research universe.
//
//   tsx --env-file=.env.local scripts/seed-intel.ts          # markets + niches + DISCOVERED pairs
//   tsx --env-file=.env.local scripts/seed-intel.ts demo     # + one ILLUSTRATIVE scored example
//
// These are SEEDS, not a permanent universe, and not measured data. Markets/niches
// are flagged is_seed=1. The optional `demo` example records evidence with
// kind=ESTIMATE and author='demo' (clearly NOT facts) purely so the admin view can
// be exercised end-to-end; it produces a low/medium confidence exactly because the
// evidence is estimated, which is the provenance model working as intended.
//
// SAFETY: point at a throwaway DB with LEADS_DB_PATH to avoid the production DB.

import {
  upsertMarket,
  upsertNiche,
  discoverOpportunity,
  recordEvidence,
  scoreOpportunityById,
  type MarketInput,
  type NicheInput,
} from "../lib/intel";

// Live CSRA markets (link to the published SEO city slugs) + research seeds.
const MARKETS: MarketInput[] = [
  { city: "Augusta", state: "GA", county: "Richmond County", metro: "Augusta-Richmond County", seo_city_slug: "augusta-ga", context: "Current live baseline market." },
  { city: "Evans", state: "GA", county: "Columbia County", seo_city_slug: "evans-ga" },
  { city: "Martinez", state: "GA", county: "Columbia County", seo_city_slug: "martinez-ga" },
  { city: "Grovetown", state: "GA", county: "Columbia County", seo_city_slug: "grovetown-ga" },
  { city: "Hephzibah", state: "GA", county: "Richmond County", seo_city_slug: "hephzibah-ga" },
  { city: "North Augusta", state: "SC", county: "Aiken County", seo_city_slug: "north-augusta-sc" },
  { city: "Aiken", state: "SC", county: "Aiken County", seo_city_slug: "aiken-sc" },
  // Research seeds (not yet live) — Step 10 starting universe.
  { city: "Thomson", state: "GA", county: "McDuffie County", is_seed: true },
  { city: "Waynesboro", state: "GA", county: "Burke County", is_seed: true },
  { city: "Washington", state: "GA", county: "Wilkes County", is_seed: true },
  { city: "Edgefield", state: "SC", county: "Edgefield County", is_seed: true },
  { city: "Greenwood", state: "SC", county: "Greenwood County", is_seed: true },
  { city: "Barnwell", state: "SC", county: "Barnwell County", is_seed: true },
  { city: "Orangeburg", state: "SC", county: "Orangeburg County", is_seed: true },
];

const NICHES: NicheInput[] = [
  { slug: "property-cleanouts", label: "Property Cleanouts", lead_service: "junk-removal", is_seed: true },
  { slug: "rental-tenant-cleanouts", label: "Rental / Tenant Cleanouts", lead_service: "junk-removal", recurring_b2b: true, is_seed: true },
  { slug: "estate-cleanouts", label: "Estate Cleanouts", lead_service: "junk-removal", is_seed: true },
  { slug: "renovation-debris-removal", label: "Renovation Debris Removal", lead_service: "junk-removal", is_seed: true },
  { slug: "carpet-removal", label: "Carpet Removal", lead_service: "junk-removal", is_seed: true },
  { slug: "overgrown-property-cleanup", label: "Overgrown Property Cleanup", lead_service: "landscaping", seasonality: "spring-summer", is_seed: true },
  { slug: "playset-shed-removal", label: "Playset / Shed / Outdoor Structure Removal", lead_service: "junk-removal", is_seed: true },
  { slug: "land-clearing", label: "Land Clearing", lead_service: "landscaping", is_seed: true },
  { slug: "tree-debris-removal", label: "Tree / Storm Debris Removal", lead_service: "landscaping", seasonality: "storm-season", is_seed: true },
];

function main() {
  const markets = MARKETS.map(upsertMarket);
  const niches = NICHES.map(upsertNiche);
  console.log(`Seeded ${markets.length} markets and ${niches.length} niches.`);

  // Discover a few candidate pairs for the live baseline market (no scores — just
  // candidates entering the pipeline at DISCOVERED).
  const augusta = markets.find((m) => m.city === "Augusta")!;
  const pairNiches = niches.filter((n) =>
    ["property-cleanouts", "rental-tenant-cleanouts", "estate-cleanouts"].includes(n.slug),
  );
  for (const n of pairNiches) discoverOpportunity(augusta.id, n.id);
  console.log(`Discovered ${pairNiches.length} candidate opportunities for Augusta (DISCOVERED, unscored).`);

  if (process.argv.includes("demo")) {
    const thomson = markets.find((m) => m.city === "Thomson")!;
    const cleanouts = niches.find((n) => n.slug === "property-cleanouts")!;
    const opp = discoverOpportunity(thomson.id, cleanouts.id);

    // ILLUSTRATIVE estimates only — kind=ESTIMATE, author='demo'. NOT measured.
    const est = (factor_key: string, value_num: number) =>
      recordEvidence({
        opportunity_id: opp.id,
        factor_key,
        value_num,
        kind: "ESTIMATE",
        author: "demo",
        notes: "Illustrative seed value — replace with researched evidence.",
      });

    est("search_demand", 55);
    est("keyword_breadth", 45);
    est("competitor_count", 3); // few competitors → strong advantage
    est("competitor_web_quality", 35);
    est("competitor_review_strength", 30);
    est("seo_difficulty", 30);
    est("ticket_size_usd", 750);
    est("gross_margin_pct", 55);
    est("recurring_potential", 30);
    est("contractor_availability", 80);
    est("fulfillment_radius_fit", 75);
    est("paid_difficulty", 40);
    est("organic_opportunity", 70);
    est("strategic_fit", 80);

    const r = scoreOpportunityById(opp.id);
    console.log(
      `\nDemo: Thomson, GA — Property Cleanouts → ${r.overall}/100 (${r.confidenceLabel} confidence) → ${r.verdict}`,
    );
    console.log("Components:", r.components);
    console.log("Reasons:", r.reasons.join("; "));
  }
}

main();
