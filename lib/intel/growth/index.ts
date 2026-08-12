// Growth Engine — analyze live markets (Augusta today) and turn performance
// patterns into recommendations. Runs ONLY on data that actually exists: when an
// integration is unavailable, the patterns needing it are reported as SKIPPED
// (never silently dropped), so a reader always knows what was and wasn't checked.

import db from "../../db";
import { v4 as uuidv4 } from "uuid";
import {
  ALL_ADAPTERS,
  leadsAdapter,
  integrationStatus,
  type AdapterStatus,
  type PageStat,
} from "./adapters";
import { createRecommendation } from "../recommendations";
import type { Recommendation, PerformanceSource, PerformanceScope } from "../types";

// ── Tunable thresholds (transparent, not hidden in a prompt) ─────────────────
export const GROWTH_THRESHOLDS = {
  highImpressions: 500, // per period, to call CTR "low" meaningfully
  lowCtr: 0.02, // 2%
  commercialPositionLow: 5, // positions 5..15 = "page 1-2, improvable"
  commercialPositionHigh: 15,
  lowConversionRate: 0.02, // sessions → leads
  goodLeadFloor: 5, // "good lead volume" for a page/market
  lowSessions: 100,
};

export interface CombinedPageStat extends PageStat {
  leads?: number;
  sources: PerformanceSource[];
}

/**
 * Snapshot the current page-level picture by merging every AVAILABLE adapter.
 * Today that's the leads adapter (real) plus any performance snapshots already
 * persisted in intel_performance. Returns [] shaped rows keyed by page.
 */
export async function getPagePerformance(): Promise<CombinedPageStat[]> {
  const byId = new Map<string, CombinedPageStat>();

  const ensure = (id: string): CombinedPageStat => {
    let row = byId.get(id);
    if (!row) {
      row = { identifier: id, sources: [] };
      byId.set(id, row);
    }
    return row;
  };

  // Real lead signal.
  for (const r of leadsAdapter.fetchLeadStatsByPage()) {
    const row = ensure(r.identifier);
    row.leads = r.leads;
    if (!row.sources.includes("leads")) row.sources.push("leads");
  }

  // Any persisted snapshots (populated by real adapters in P1B).
  const snaps = db
    .prepare(
      `SELECT identifier, source, impressions, clicks, ctr, position, sessions, conversions
         FROM intel_performance
        WHERE scope = 'page'
        ORDER BY as_of DESC`,
    )
    .all() as {
    identifier: string;
    source: PerformanceSource;
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
    position: number | null;
    sessions: number | null;
    conversions: number | null;
  }[];

  const seen = new Set<string>(); // keep newest snapshot per (page, source)
  for (const s of snaps) {
    const k = `${s.identifier}::${s.source}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const row = ensure(s.identifier);
    if (!row.sources.includes(s.source)) row.sources.push(s.source);
    row.impressions ??= s.impressions ?? undefined;
    row.clicks ??= s.clicks ?? undefined;
    row.ctr ??= s.ctr ?? undefined;
    row.position ??= s.position ?? undefined;
    row.sessions ??= s.sessions ?? undefined;
    row.conversions ??= s.conversions ?? undefined;
  }

  return [...byId.values()];
}

export interface MarketPerformance {
  identifier: string; // attributed city (from leads.city) or '(unattributed)'
  leads: number;
}

/** Real lead volume grouped by attributed city — the market-level view we have today. */
export function getMarketPerformance(): MarketPerformance[] {
  return db
    .prepare(
      `SELECT COALESCE(city, '(unattributed)') AS identifier, COUNT(*) AS leads
         FROM leads
        GROUP BY COALESCE(city, '(unattributed)')
        ORDER BY leads DESC`,
    )
    .all() as MarketPerformance[];
}

export interface GrowthAnalysis {
  integrations: AdapterStatus[];
  created: Recommendation[];
  skippedPatterns: string[]; // patterns not evaluated due to missing integrations
  pagesAnalyzed: number;
}

/**
 * Evaluate the pattern rules over current performance and PROPOSE recommendations
 * (RECOMMEND-level — no approval needed to merely propose). Patterns whose inputs
 * aren't available are listed in `skippedPatterns` rather than firing on guesses.
 */
export async function generateGrowthRecommendations(): Promise<GrowthAnalysis> {
  const integrations = integrationStatus();
  const has = (s: PerformanceSource) =>
    integrations.find((i) => i.source === s)?.available ?? false;

  const pages = await getPagePerformance();
  const created: Recommendation[] = [];
  const skipped: string[] = [];
  const T = GROWTH_THRESHOLDS;

  const gsc = has("gsc");
  const ga4 = has("ga4");

  if (!gsc) {
    skipped.push("HIGH_IMPRESSIONS_LOW_CTR → OPTIMIZE_PAGE (needs Search Console)");
    skipped.push("POSITION_5_15_COMMERCIAL → INVESTIGATE_QUERY (needs Search Console)");
  }
  if (!ga4) {
    skipped.push("TRAFFIC_LOW_CONVERSION → IMPROVE_CONVERSION (needs GA4 sessions)");
  }

  for (const p of pages) {
    // Pattern: HIGH impressions + LOW CTR → title/meta opportunity.
    if (gsc && p.impressions !== undefined && p.ctr !== undefined) {
      if (p.impressions >= T.highImpressions && p.ctr < T.lowCtr) {
        created.push(
          createRecommendation({
            type: "OPTIMIZE_PAGE",
            target: p.identifier,
            reason: `High impressions (${p.impressions}) but low CTR (${(p.ctr * 100).toFixed(1)}%) — likely a title/meta opportunity.`,
            evidence: { impressions: p.impressions, ctr: p.ctr },
            expected_impact: "More clicks from existing impressions",
            confidence: 60,
            priority: "high",
            effort: "low",
            dedup_key: `OPTIMIZE_PAGE:${p.identifier}`,
          }),
        );
      }
    }

    // Pattern: positions 5–15 → SEO push to page one.
    if (gsc && p.position !== undefined) {
      if (p.position >= T.commercialPositionLow && p.position <= T.commercialPositionHigh) {
        created.push(
          createRecommendation({
            type: "INVESTIGATE_QUERY",
            target: p.identifier,
            reason: `Ranking at position ${p.position.toFixed(1)} — within striking distance of page one.`,
            evidence: { position: p.position },
            expected_impact: "Move to page-one positions",
            confidence: 55,
            priority: "medium",
            effort: "medium",
            dedup_key: `INVESTIGATE_QUERY:${p.identifier}`,
          }),
        );
      }
    }

    // Pattern: traffic + low conversion → landing-page/CRO opportunity.
    if (ga4 && p.sessions !== undefined && p.sessions >= T.lowSessions) {
      const leads = p.leads ?? p.conversions ?? 0;
      const cr = p.sessions > 0 ? leads / p.sessions : 0;
      if (cr < T.lowConversionRate) {
        created.push(
          createRecommendation({
            type: "IMPROVE_CONVERSION",
            target: p.identifier,
            reason: `${p.sessions} sessions but only ${leads} leads (${(cr * 100).toFixed(1)}%) — CRO opportunity.`,
            evidence: { sessions: p.sessions, leads, conversionRate: cr },
            expected_impact: "More leads from existing traffic",
            confidence: 55,
            priority: "high",
            effort: "medium",
            dedup_key: `IMPROVE_CONVERSION:${p.identifier}`,
          }),
        );
      }
    }

    // Pattern: good lead volume + low/unknown traffic → acquisition expansion.
    if ((p.leads ?? 0) >= T.goodLeadFloor && (p.sessions === undefined || p.sessions < T.lowSessions)) {
      created.push(
        createRecommendation({
          type: "EXPAND_MARKET",
          target: p.identifier,
          reason: `Page already produces ${p.leads} leads with little/unknown traffic — worth driving more visitors.`,
          evidence: { leads: p.leads, sessions: p.sessions ?? null },
          expected_impact: "Scale a proven converter",
          confidence: 50,
          priority: "medium",
          effort: "medium",
          dedup_key: `EXPAND_MARKET:${p.identifier}`,
        }),
      );
    }
  }

  return { integrations, created, skippedPatterns: skipped, pagesAnalyzed: pages.length };
}

// Persist a real performance snapshot (used by adapters in P1B; exposed now so the
// pipeline is complete and testable). Never called with fabricated data.
export function recordPerformanceSnapshot(row: {
  scope: PerformanceScope;
  identifier: string;
  source: PerformanceSource;
  as_of: string;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  position?: number | null;
  sessions?: number | null;
  conversions?: number | null;
  cost?: number | null;
}): void {
  db.prepare(
    `INSERT INTO intel_performance
       (id, scope, identifier, source, as_of, impressions, clicks, ctr, position, sessions, conversions, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    uuidv4(),
    row.scope,
    row.identifier,
    row.source,
    row.as_of,
    row.impressions ?? null,
    row.clicks ?? null,
    row.ctr ?? null,
    row.position ?? null,
    row.sessions ?? null,
    row.conversions ?? null,
    row.cost ?? null,
  );
}

export { ALL_ADAPTERS, integrationStatus };
