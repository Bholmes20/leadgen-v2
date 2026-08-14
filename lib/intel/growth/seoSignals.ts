// Deterministic Search Console SEO signals (P1C, Step 6).
//
// Built on the ingested intel_search_metrics store via seoAnalytics. Every signal
// preserves measured values, comparison values, the exact threshold, the date
// range, the target page/query, market/niche mapping, confidence, and data
// quality. When GSC is not connected (or has no data), signals are SUPPRESSED and
// reported in `skipped` — never fabricated.

import db from "../../db";
import {
  getSeoConnection,
  getSeoPerformance,
  getTopPages,
  getTopQueries,
  comparePeriods,
  comparisonWindows,
  pageSlugFromUrl,
} from "./seoAnalytics";
import { recordSignal, type SignalInput } from "./signals";
import { marketBySeoSlug, nicheBySlug, resolveMarket, resolveNiche, normalizeSlug } from "../mapping";
import { getPublishedPages } from "../../seo/pages";
import type { ConnectionState, Signal, SignalType } from "../types";

// ── Transparent SEO thresholds (config, never in a prompt) ───────────────────
export const SEO_SIGNAL_THRESHOLDS = {
  comparisonDays: 28,
  highImpressions: 300, // "seen a lot" for a page
  lowCtr: 0.02, // 2%
  impressionsNoClicksMin: 50, // impressions with zero clicks
  clicksNoLeadsMin: 10, // clicks with zero attributed leads
  commercialPosLow: 5,
  commercialPosHigh: 15,
  nearPageOneLow: 11, // positions 11..20 → near page one
  nearPageOneHigh: 20,
  nearTopThreeLow: 4, // positions 4..7 → near top three
  nearTopThreeHigh: 7,
  visibilityGainPct: 0.3, // +30% impressions vs previous period
  visibilityLossPct: -0.3, // -30%
  ctrDeclineDelta: -0.01, // -1 percentage point
  positionImproveDelta: -1.0, // improved by ≥1 position (lower is better)
  positionDeclineDelta: 1.0, // worsened by ≥1 position
  leadsGrowingVisibilityGainPct: 0.15,
} as const;

export interface SeoSignalEvaluation {
  connection: ConnectionState;
  created: Signal[];
  refreshed: Signal[];
  skipped: { signal_type: SignalType; reason: string }[];
  evaluatedPages: number;
  evaluatedQueries: number;
}

export const ALL_SEO_SIGNALS: SignalType[] = [
  "HIGH_IMPRESSIONS_LOW_CTR",
  "PAGE_WITH_IMPRESSIONS_NO_CLICKS",
  "PAGE_WITH_CLICKS_NO_LEADS",
  "COMMERCIAL_QUERY_POSITION_5_15",
  "QUERY_POSITION_NEAR_PAGE_ONE",
  "QUERY_POSITION_NEAR_TOP_THREE",
  "PAGE_GAINING_VISIBILITY",
  "PAGE_LOSING_VISIBILITY",
  "QUERY_GAINING_VISIBILITY",
  "CTR_DECLINING",
  "POSITION_IMPROVING",
  "POSITION_DECLINING",
  "PAGE_WITH_LEADS_AND_GROWING_VISIBILITY",
];

// Map a GSC page URL/path to intel market/niche via the published SEO registry.
function mapPage(pageUrlOrSlug: string): {
  slug: string | null;
  marketId: string | null;
  nicheId: string | null;
} {
  const slug = pageSlugFromUrl(pageUrlOrSlug);
  if (!slug) return { slug: null, marketId: null, nicheId: null };
  const page = getPublishedPages().find((p) => p.slug === slug);
  if (!page) return { slug, marketId: null, nicheId: null };
  const market = resolveMarket(page.city.slug, marketBySeoSlug()).market;
  const niche = resolveNiche(page.niche.slug, nicheBySlug()).niche;
  return { slug, marketId: market?.id ?? null, nicheId: niche?.id ?? null };
}

// Attributed leads per normalized page slug (for click→lead signals).
function leadsByPageSlug(): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT source_page, COUNT(*) AS n FROM leads
        WHERE source_page IS NOT NULL AND TRIM(source_page) <> ''
        GROUP BY source_page`,
    )
    .all() as { source_page: string; n: number }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const slug = normalizeSlug(r.source_page);
    if (slug) map.set(slug, (map.get(slug) ?? 0) + r.n);
  }
  return map;
}

/**
 * Evaluate all Search Console SEO signals deterministically. `now` and
 * `comparisonDays` are injectable for tests. Suppressed when GSC absent/empty.
 */
export function evaluateSeoSignals(
  opts: { now?: string; comparisonDays?: number } = {},
): SeoSignalEvaluation {
  const connection = getSeoConnection();
  const days = opts.comparisonDays ?? SEO_SIGNAL_THRESHOLDS.comparisonDays;
  const created: Signal[] = [];
  const refreshed: Signal[] = [];

  if (connection !== "CONNECTED") {
    return {
      connection,
      created,
      refreshed,
      skipped: ALL_SEO_SIGNALS.map((t) => ({ signal_type: t, reason: "Search Console not connected" })),
      evaluatedPages: 0,
      evaluatedQueries: 0,
    };
  }

  const perf = getSeoPerformance(days, opts.now);
  const { latest, previous } = comparisonWindows(days, opts.now);
  const T = SEO_SIGNAL_THRESHOLDS;

  const emit = (input: SignalInput) => {
    const { signal, created: isNew } = recordSignal({
      ...input,
      event_type: "SEO_SIGNAL_DETECTED",
      period_start: input.period_start ?? latest.start,
      period_end: input.period_end ?? latest.end,
    });
    (isNew ? created : refreshed).push(signal);
  };

  if (!perf.hasData) {
    emit({
      signal_type: "INSUFFICIENT_DATA",
      scope: "system",
      target: "seo",
      severity: "notice",
      confidence: 100,
      data_quality: "MEASURED",
      event_type: "SEO_SIGNAL_DETECTED",
      measured: { impressions: 0, window: latest },
      threshold: { note: "no Search Console rows in window" },
    });
    return { connection, created, refreshed, skipped: [], evaluatedPages: 0, evaluatedQueries: 0 };
  }

  const topPages = getTopPages(days, 100, opts.now);
  const topQueries = getTopQueries(days, 200, opts.now);
  const pageCmp = comparePeriods("page", days, opts.now);
  const queryCmp = comparePeriods("query", days, opts.now);
  const leadCounts = leadsByPageSlug();

  // ── Absolute page signals ──────────────────────────────────────────────────
  for (const p of topPages) {
    const m = mapPage(p.path);
    const base = { scope: "page" as const, target: m.slug ?? p.path, market_id: m.marketId, niche_id: m.nicheId };

    if (p.impressions >= T.highImpressions && p.ctr != null && p.ctr < T.lowCtr) {
      emit({
        ...base,
        signal_type: "HIGH_IMPRESSIONS_LOW_CTR",
        severity: "notice",
        confidence: 75,
        data_quality: "MEASURED",
        measured: { impressions: p.impressions, clicks: p.clicks, ctr: p.ctr, position: p.position },
        threshold: { highImpressions: T.highImpressions, lowCtr: T.lowCtr },
      });
    }
    if (p.impressions >= T.impressionsNoClicksMin && p.clicks === 0) {
      emit({
        ...base,
        signal_type: "PAGE_WITH_IMPRESSIONS_NO_CLICKS",
        severity: "notice",
        confidence: 70,
        data_quality: "MEASURED",
        measured: { impressions: p.impressions, clicks: 0, position: p.position },
        threshold: { impressionsNoClicksMin: T.impressionsNoClicksMin },
      });
    }
    const leads = m.slug ? leadCounts.get(m.slug) ?? 0 : 0;
    if (p.clicks >= T.clicksNoLeadsMin && leads === 0) {
      emit({
        ...base,
        signal_type: "PAGE_WITH_CLICKS_NO_LEADS",
        severity: "warning",
        confidence: 65,
        data_quality: "DERIVED",
        measured: { clicks: p.clicks, leads: 0 },
        threshold: { clicksNoLeadsMin: T.clicksNoLeadsMin },
      });
    }
  }

  // ── Absolute query signals ──────────────────────────────────────────────────
  for (const q of topQueries) {
    if (q.position == null) continue;
    const base = { scope: "query" as const, target: q.key };
    if (q.commercial && q.position >= T.commercialPosLow && q.position <= T.commercialPosHigh) {
      emit({
        ...base,
        signal_type: "COMMERCIAL_QUERY_POSITION_5_15",
        severity: "notice",
        confidence: 70,
        data_quality: "MEASURED",
        measured: { position: q.position, impressions: q.impressions, commercial: true },
        threshold: { low: T.commercialPosLow, high: T.commercialPosHigh },
      });
    }
    if (q.position >= T.nearPageOneLow && q.position <= T.nearPageOneHigh) {
      emit({
        ...base,
        signal_type: "QUERY_POSITION_NEAR_PAGE_ONE",
        severity: "info",
        confidence: 60,
        data_quality: "MEASURED",
        measured: { position: q.position, impressions: q.impressions },
        threshold: { low: T.nearPageOneLow, high: T.nearPageOneHigh },
      });
    }
    if (q.position >= T.nearTopThreeLow && q.position <= T.nearTopThreeHigh) {
      emit({
        ...base,
        signal_type: "QUERY_POSITION_NEAR_TOP_THREE",
        severity: "info",
        confidence: 60,
        data_quality: "MEASURED",
        measured: { position: q.position, impressions: q.impressions },
        threshold: { low: T.nearTopThreeLow, high: T.nearTopThreeHigh },
      });
    }
  }

  // ── Comparison page signals (min-data gated) ────────────────────────────────
  for (const c of pageCmp) {
    if (!c.meetsMinData) continue;
    const m = mapPage(c.key);
    const base = { scope: "page" as const, target: m.slug ?? c.key, market_id: m.marketId, niche_id: m.nicheId };
    const compare = {
      period_start: latest.start,
      period_end: latest.end,
      comparison_period_start: previous.start,
      comparison_period_end: previous.end,
      measured: { latest: c.latest, previous: c.previous, impressionsPct: c.impressionsPct, ctrDelta: c.ctrDelta, positionDelta: c.positionDelta },
    };

    if (c.impressionsPct != null && c.impressionsPct >= T.visibilityGainPct) {
      emit({ ...base, ...compare, signal_type: "PAGE_GAINING_VISIBILITY", severity: "info", confidence: 70, data_quality: "MEASURED", threshold: { visibilityGainPct: T.visibilityGainPct } });
      const leads = m.slug ? leadCounts.get(m.slug) ?? 0 : 0;
      if (leads >= 1 && c.impressionsPct >= T.leadsGrowingVisibilityGainPct) {
        emit({ ...base, ...compare, signal_type: "PAGE_WITH_LEADS_AND_GROWING_VISIBILITY", severity: "notice", confidence: 70, data_quality: "DERIVED", measured: { ...compare.measured, leads }, threshold: { leadsGrowingVisibilityGainPct: T.leadsGrowingVisibilityGainPct } });
      }
    }
    if (c.impressionsPct != null && c.impressionsPct <= T.visibilityLossPct) {
      emit({ ...base, ...compare, signal_type: "PAGE_LOSING_VISIBILITY", severity: "warning", confidence: 70, data_quality: "MEASURED", threshold: { visibilityLossPct: T.visibilityLossPct } });
    }
    if (c.ctrDelta != null && c.ctrDelta <= T.ctrDeclineDelta) {
      emit({ ...base, ...compare, signal_type: "CTR_DECLINING", severity: "notice", confidence: 65, data_quality: "MEASURED", threshold: { ctrDeclineDelta: T.ctrDeclineDelta } });
    }
    if (c.positionDelta != null && c.positionDelta <= T.positionImproveDelta) {
      emit({ ...base, ...compare, signal_type: "POSITION_IMPROVING", severity: "info", confidence: 65, data_quality: "MEASURED", threshold: { positionImproveDelta: T.positionImproveDelta } });
    }
    if (c.positionDelta != null && c.positionDelta >= T.positionDeclineDelta) {
      emit({ ...base, ...compare, signal_type: "POSITION_DECLINING", severity: "warning", confidence: 65, data_quality: "MEASURED", threshold: { positionDeclineDelta: T.positionDeclineDelta } });
    }
  }

  // ── Comparison query signals ────────────────────────────────────────────────
  for (const c of queryCmp) {
    if (!c.meetsMinData) continue;
    if (c.impressionsPct != null && c.impressionsPct >= T.visibilityGainPct) {
      emit({
        scope: "query",
        target: c.key,
        signal_type: "QUERY_GAINING_VISIBILITY",
        severity: "info",
        confidence: 65,
        data_quality: "MEASURED",
        period_start: latest.start,
        period_end: latest.end,
        comparison_period_start: previous.start,
        comparison_period_end: previous.end,
        measured: { latest: c.latest, previous: c.previous, impressionsPct: c.impressionsPct },
        threshold: { visibilityGainPct: T.visibilityGainPct },
      });
    }
  }

  return { connection, created, refreshed, skipped: [], evaluatedPages: topPages.length, evaluatedQueries: topQueries.length };
}
