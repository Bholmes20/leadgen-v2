// Reusable page-performance model (P1B, Step 3).
//
// Source of truth for the page universe is the lib/seo registry (published niche ×
// city pages + niche/city hubs) — NO Augusta slugs are hard-coded here; it works
// for every published market. Each page is joined to real lead outcomes, its
// recommendation/experiment counts, and Search Console metrics when connected
// (UNKNOWN/NOT_CONNECTED otherwise).

import db from "../../db";
import { getPublishedPages, getNicheHubs, getCityHubs } from "../../seo/pages";
import { marketBySeoSlug, nicheBySlug, resolveMarket, resolveNiche, normalizeSlug } from "../mapping";
import { searchConsoleAdapter } from "./adapters";
import { STATUS_BUCKETS, type MetricValue } from "./performance";
import type { ConnectionState, DataQuality } from "../types";

export type PageType = "page" | "niche_hub" | "city_hub";

export interface PageSearchMetrics {
  status: ConnectionState; // CONNECTED (has data) | NOT_CONNECTED
  quality: DataQuality;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  position: number | null;
}

export interface PagePerformanceRow {
  path: string; // "/rental-property-cleanout-augusta-ga"
  slug: string; // normalized, no leading slash
  pageType: PageType;
  published: boolean;
  citySlug: string | null;
  nicheSlug: string | null;
  marketId: string | null; // resolved intel market
  nicheId: string | null; // resolved intel niche
  leads: number;
  byBucket: Record<string, number>;
  won: number;
  qualified: MetricValue; // UNKNOWN — no reliable field
  recommendationCount: number;
  experimentCount: number;
  search: PageSearchMetrics;
}

interface LeadAgg {
  leads: number;
  buckets: Record<string, number>;
  won: number;
}

// Aggregate lead outcomes keyed by normalized source_page slug (one query).
function leadsByPageSlug(): Map<string, LeadAgg> {
  const rows = db
    .prepare(
      `SELECT source_page, status, COUNT(*) AS n
         FROM leads
        WHERE source_page IS NOT NULL AND TRIM(source_page) <> ''
        GROUP BY source_page, status`,
    )
    .all() as { source_page: string; status: string | null; n: number }[];

  const map = new Map<string, LeadAgg>();
  for (const r of rows) {
    const slug = normalizeSlug(r.source_page);
    if (!slug) continue;
    let agg = map.get(slug);
    if (!agg) {
      agg = { leads: 0, buckets: {}, won: 0 };
      map.set(slug, agg);
    }
    agg.leads += r.n;
    const bucket = STATUS_BUCKETS[(r.status ?? "").trim().toUpperCase()] ?? "other";
    agg.buckets[bucket] = (agg.buckets[bucket] ?? 0) + r.n;
    if (bucket === "won") agg.won += r.n;
  }
  return map;
}

// Recommendation counts keyed by target (targets are stored as page slugs).
function recCountByTarget(): Map<string, number> {
  const rows = db
    .prepare(`SELECT target, COUNT(*) AS n FROM intel_recommendations GROUP BY target`)
    .all() as { target: string; n: number }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const slug = normalizeSlug(r.target) ?? r.target;
    map.set(slug, (map.get(slug) ?? 0) + r.n);
  }
  return map;
}

// Experiment counts by page slug — landing_pages is a JSON string[] of slugs.
function experimentCountByPage(): Map<string, number> {
  const rows = db
    .prepare(`SELECT landing_pages FROM intel_experiments WHERE landing_pages IS NOT NULL`)
    .all() as { landing_pages: string }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    let slugs: unknown;
    try {
      slugs = JSON.parse(r.landing_pages);
    } catch {
      continue;
    }
    if (!Array.isArray(slugs)) continue;
    for (const s of slugs) {
      const slug = normalizeSlug(String(s));
      if (slug) map.set(slug, (map.get(slug) ?? 0) + 1);
    }
  }
  return map;
}

// Search Console metrics for a page (latest date), or NOT_CONNECTED marker.
function searchMetricsFor(path: string, connected: boolean): PageSearchMetrics {
  if (!connected) {
    return { status: "NOT_CONNECTED", quality: "UNKNOWN", impressions: null, clicks: null, ctr: null, position: null };
  }
  const row = db
    .prepare(
      `SELECT SUM(impressions) AS impressions, SUM(clicks) AS clicks,
              AVG(ctr) AS ctr, AVG(position) AS position, MAX(date) AS d
         FROM intel_search_metrics
        WHERE page = ? OR page = ?`,
    )
    .get(path, path.replace(/^\//, "")) as
    | { impressions: number | null; clicks: number | null; ctr: number | null; position: number | null; d: string | null }
    | undefined;
  if (!row || row.d == null) {
    return { status: "CONNECTED", quality: "UNKNOWN", impressions: null, clicks: null, ctr: null, position: null };
  }
  return {
    status: "CONNECTED",
    quality: "MEASURED",
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    position: row.position,
  };
}

/**
 * Build the page-performance table across every published page and hub. Reusable
 * beyond Augusta: it enumerates whatever the SEO registry has published.
 */
export function buildPagePerformance(): PagePerformanceRow[] {
  const leadAgg = leadsByPageSlug();
  const recCounts = recCountByTarget();
  const expCounts = experimentCountByPage();
  const marketIdx = marketBySeoSlug();
  const nicheIdx = nicheBySlug();
  const gscConnected = searchConsoleAdapter.isAvailable();

  const rows: PagePerformanceRow[] = [];

  const push = (
    slug: string,
    pageType: PageType,
    citySlug: string | null,
    nicheSlug: string | null,
  ) => {
    const path = `/${slug}`;
    const agg = leadAgg.get(slug) ?? { leads: 0, buckets: {}, won: 0 };
    const market = citySlug ? resolveMarket(citySlug, marketIdx).market : null;
    const niche = nicheSlug ? resolveNiche(nicheSlug, nicheIdx).niche : null;
    rows.push({
      path,
      slug,
      pageType,
      published: true,
      citySlug,
      nicheSlug,
      marketId: market?.id ?? null,
      nicheId: niche?.id ?? null,
      leads: agg.leads,
      byBucket: agg.buckets,
      won: agg.won,
      qualified: {
        value: null,
        quality: "UNKNOWN",
        note: "No reliable qualification field in the leads schema.",
      },
      recommendationCount: recCounts.get(slug) ?? 0,
      experimentCount: expCounts.get(slug) ?? 0,
      search: searchMetricsFor(path, gscConnected),
    });
  };

  for (const p of getPublishedPages()) push(p.slug, "page", p.city.slug, p.niche.slug);
  for (const h of getNicheHubs()) push(h.slug, "niche_hub", null, h.niche.slug);
  for (const h of getCityHubs()) push(h.slug, "city_hub", h.city.slug, null);

  // Highest lead volume first, then by name for stable ordering.
  return rows.sort((a, b) => b.leads - a.leads || a.slug.localeCompare(b.slug));
}

/** One page's performance by slug/path (leading slash optional). */
export function getPagePerformanceBySlug(slugOrPath: string): PagePerformanceRow | null {
  const slug = normalizeSlug(slugOrPath);
  if (!slug) return null;
  return buildPagePerformance().find((r) => r.slug === slug) ?? null;
}
