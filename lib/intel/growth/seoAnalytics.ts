// Augusta (and any market) SEO baseline + comparison windows (P1C, Step 4/5).
//
// Reads the ingested intel_search_metrics store — which represents OUR observed
// Google performance, NOT absolute search volume. Everything is deterministic and
// impression-weighted. Comparison windows apply explicit minimum-data thresholds
// so tiny samples never produce dramatic deltas.

import db from "../../db";
import { resolveMarket, resolveNiche, marketBySeoSlug, nicheBySlug, normalizeSlug } from "../mapping";
import { getPublishedPages } from "../../seo/pages";
import { searchConsoleAdapter } from "./adapters";
import type { ConnectionState } from "../types";

// Transparent classification config (not hidden in a prompt).
export const SEO_CONFIG = {
  brandTerms: ["esee", "eseeent", "esee ent", "esee environmental"],
  commercialTerms: [
    "near me", "cost", "price", "pricing", "quote", "cheap", "affordable",
    "company", "service", "services", "removal", "cleanout", "clean out",
    "haul", "hauling", "junk", "dumpster", "same day",
  ],
};

export const SEO_COMPARISON = {
  minImpressions: 30, // combined across both periods before a comparison counts
  minImpressionsPerPeriod: 10, // each period needs at least this to be meaningful
};

export interface SeoWindow {
  days: number;
  start: string;
  end: string;
}

export interface SeoTotals {
  clicks: number;
  impressions: number;
  ctr: number | null; // clicks / impressions
  position: number | null; // impression-weighted average
}

export interface SeoPerformance {
  connection: ConnectionState;
  property: string | null;
  window: SeoWindow;
  totals: SeoTotals;
  hasData: boolean;
}

export interface SeoRow extends SeoTotals {
  key: string; // page path or query text
}

export interface SeoPageRow extends SeoRow {
  path: string;
  nicheSlug: string | null;
  citySlug: string | null;
  marketId: string | null;
  nicheId: string | null;
  published: boolean;
}

export interface SeoQueryRow extends SeoRow {
  branded: boolean | null; // null when unclassifiable
  commercial: boolean;
}

export interface ComparisonRow {
  key: string;
  latest: SeoTotals;
  previous: SeoTotals;
  clicksDelta: number;
  impressionsDelta: number;
  impressionsPct: number | null; // vs previous
  ctrDelta: number | null;
  positionDelta: number | null; // latest - previous; NEGATIVE = improved rank
  meetsMinData: boolean;
}

// ── date helpers (UTC, deterministic) ────────────────────────────────────────
function addDays(iso: string, days: number): number {
  return Date.parse(iso) + days * 86_400_000;
}
function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Latest window [start,end] ending yesterday, plus the immediately-preceding one. */
export function comparisonWindows(days: number, asOf?: string): { latest: SeoWindow; previous: SeoWindow } {
  const now = asOf ?? new Date().toISOString();
  const latestEnd = dayString(addDays(now, -1));
  const latestStart = dayString(addDays(`${latestEnd}T00:00:00Z`, -(days - 1)));
  const prevEnd = dayString(addDays(`${latestStart}T00:00:00Z`, -1));
  const prevStart = dayString(addDays(`${prevEnd}T00:00:00Z`, -(days - 1)));
  return {
    latest: { days, start: latestStart, end: latestEnd },
    previous: { days, start: prevStart, end: prevEnd },
  };
}

export function getSeoConnection(): ConnectionState {
  return searchConsoleAdapter.connectionState();
}

function totalsForWindow(w: SeoWindow): SeoTotals {
  const r = db
    .prepare(
      `SELECT COALESCE(SUM(clicks),0) AS clicks,
              COALESCE(SUM(impressions),0) AS impressions,
              SUM(position * impressions) AS wpos
         FROM intel_search_metrics
        WHERE date BETWEEN ? AND ?`,
    )
    .get(w.start, w.end) as { clicks: number; impressions: number; wpos: number | null };
  return toTotals(r.clicks, r.impressions, r.wpos);
}

function toTotals(clicks: number, impressions: number, wpos: number | null): SeoTotals {
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : null,
    position: impressions > 0 && wpos != null ? wpos / impressions : null,
  };
}

/** Baseline SEO performance over the latest `days`-day window. */
export function getSeoPerformance(days = 28, asOf?: string): SeoPerformance {
  const { latest } = comparisonWindows(days, asOf);
  const totals = totalsForWindow(latest);
  return {
    connection: getSeoConnection(),
    property: searchConsoleAdapter.property(),
    window: latest,
    totals,
    hasData: totals.impressions > 0,
  };
}

function isBranded(query: string): boolean {
  const q = query.toLowerCase();
  return SEO_CONFIG.brandTerms.some((t) => q.includes(t));
}
function isCommercial(query: string): boolean {
  const q = query.toLowerCase();
  return SEO_CONFIG.commercialTerms.some((t) => q.includes(t));
}

/** Top pages by impressions in the latest window, mapped to market/niche. */
export function getTopPages(days = 28, limit = 20, asOf?: string): SeoPageRow[] {
  const { latest } = comparisonWindows(days, asOf);
  const rows = db
    .prepare(
      `SELECT page,
              COALESCE(SUM(clicks),0) AS clicks,
              COALESCE(SUM(impressions),0) AS impressions,
              SUM(position * impressions) AS wpos
         FROM intel_search_metrics
        WHERE date BETWEEN ? AND ? AND page IS NOT NULL AND TRIM(page) <> ''
        GROUP BY page
        ORDER BY impressions DESC
        LIMIT ?`,
    )
    .all(latest.start, latest.end, limit) as { page: string; clicks: number; impressions: number; wpos: number | null }[];

  const pubSlugs = new Set(getPublishedPages().map((p) => p.slug));
  const marketIdx = marketBySeoSlug();
  const nicheIdx = nicheBySlug();

  return rows.map((r) => {
    const slug = pageSlugFromUrl(r.page);
    const { citySlug, nicheSlug } = splitPageSlug(slug);
    const market = citySlug ? resolveMarket(citySlug, marketIdx).market : null;
    const niche = nicheSlug ? resolveNiche(nicheSlug, nicheIdx).niche : null;
    return {
      key: r.page,
      path: r.page,
      ...toTotals(r.clicks, r.impressions, r.wpos),
      nicheSlug,
      citySlug,
      marketId: market?.id ?? null,
      nicheId: niche?.id ?? null,
      published: slug != null && pubSlugs.has(slug),
    };
  });
}

/** Top queries by impressions in the latest window, with branded/commercial tags. */
export function getTopQueries(days = 28, limit = 25, asOf?: string): SeoQueryRow[] {
  const { latest } = comparisonWindows(days, asOf);
  const rows = db
    .prepare(
      `SELECT query,
              COALESCE(SUM(clicks),0) AS clicks,
              COALESCE(SUM(impressions),0) AS impressions,
              SUM(position * impressions) AS wpos
         FROM intel_search_metrics
        WHERE date BETWEEN ? AND ? AND query IS NOT NULL AND TRIM(query) <> ''
        GROUP BY query
        ORDER BY impressions DESC
        LIMIT ?`,
    )
    .all(latest.start, latest.end, limit) as { query: string; clicks: number; impressions: number; wpos: number | null }[];

  return rows.map((r) => ({
    key: r.query,
    ...toTotals(r.clicks, r.impressions, r.wpos),
    branded: r.query.trim() ? isBranded(r.query) : null,
    commercial: r.query.trim() ? isCommercial(r.query) : false,
  }));
}

// Per-key totals over an explicit window, for a given dimension.
function keyedTotals(dimension: "page" | "query", w: SeoWindow): Map<string, SeoTotals> {
  const col = dimension;
  const rows = db
    .prepare(
      `SELECT ${col} AS k,
              COALESCE(SUM(clicks),0) AS clicks,
              COALESCE(SUM(impressions),0) AS impressions,
              SUM(position * impressions) AS wpos
         FROM intel_search_metrics
        WHERE date BETWEEN ? AND ? AND ${col} IS NOT NULL AND TRIM(${col}) <> ''
        GROUP BY ${col}`,
    )
    .all(w.start, w.end) as { k: string; clicks: number; impressions: number; wpos: number | null }[];
  const map = new Map<string, SeoTotals>();
  for (const r of rows) map.set(r.k, toTotals(r.clicks, r.impressions, r.wpos));
  return map;
}

const EMPTY_TOTALS: SeoTotals = { clicks: 0, impressions: 0, ctr: null, position: null };

/**
 * Period-over-period comparison for a dimension. Only keys meeting the minimum
 * data thresholds are flagged `meetsMinData` (signals require that flag).
 */
export function comparePeriods(
  dimension: "page" | "query",
  days: number,
  asOf?: string,
): ComparisonRow[] {
  const { latest, previous } = comparisonWindows(days, asOf);
  const cur = keyedTotals(dimension, latest);
  const prev = keyedTotals(dimension, previous);
  const keys = new Set([...cur.keys(), ...prev.keys()]);

  const out: ComparisonRow[] = [];
  for (const key of keys) {
    const l = cur.get(key) ?? EMPTY_TOTALS;
    const p = prev.get(key) ?? EMPTY_TOTALS;
    const meetsMinData =
      l.impressions + p.impressions >= SEO_COMPARISON.minImpressions &&
      Math.max(l.impressions, p.impressions) >= SEO_COMPARISON.minImpressionsPerPeriod;
    out.push({
      key,
      latest: l,
      previous: p,
      clicksDelta: l.clicks - p.clicks,
      impressionsDelta: l.impressions - p.impressions,
      impressionsPct: p.impressions > 0 ? (l.impressions - p.impressions) / p.impressions : null,
      ctrDelta: l.ctr != null && p.ctr != null ? l.ctr - p.ctr : null,
      positionDelta: l.position != null && p.position != null ? l.position - p.position : null,
      meetsMinData,
    });
  }
  return out.sort((a, b) => b.latest.impressions - a.latest.impressions);
}

// ── page-URL → slug helpers (mirror mapping/pageModel normalization) ─────────
// A GSC page is a full URL (https://host/slug); reduce to the bare slug.
export function pageSlugFromUrl(url: string): string | null {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return normalizeSlug(path);
  } catch {
    return normalizeSlug(url);
  }
}

// Best-effort split of a flat "{niche}-{city}" slug using the published registry.
function splitPageSlug(slug: string | null): { citySlug: string | null; nicheSlug: string | null } {
  if (!slug) return { citySlug: null, nicheSlug: null };
  const page = getPublishedPages().find((p) => p.slug === slug);
  if (page) return { citySlug: page.city.slug, nicheSlug: page.niche.slug };
  return { citySlug: null, nicheSlug: null };
}
