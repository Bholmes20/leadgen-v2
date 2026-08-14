// Evidence freshness policy (P1C, Step 9).
//
// External intelligence goes stale at different rates. This module defines, per
// research factor, how long an observation stays FRESH, and reports the freshness
// of an opportunity's evidence so the scorer/report never silently treat old
// evidence as current. resolveFactors() already DROPS evidence past its
// fresh_until; this adds the default-freshness intake policy and a freshness view.

import { FACTOR_SPECS } from "./scoring";
import { listEvidence } from "./evidence";
import type { Evidence, ScoreComponent } from "./types";

// Days an observation for a factor stays fresh. Tuned by how fast each signal
// drifts: SEO/demand refresh often; pricing shorter-lived; census/strategic long.
export const FRESHNESS_DAYS: Record<string, number> = {
  search_demand: 30,
  keyword_breadth: 60,
  demand_trend: 30,
  competitor_count: 45,
  competitor_web_quality: 90,
  competitor_review_strength: 45,
  seo_difficulty: 60,
  ticket_size_usd: 60,
  gross_margin_pct: 120,
  recurring_potential: 180,
  contractor_availability: 45,
  fulfillment_radius_fit: 180,
  remote_quoting_suitability: 180,
  paid_difficulty: 45,
  organic_opportunity: 45,
  strategic_fit: 365,
};
export const DEFAULT_FRESHNESS_DAYS = 60;

const COMPONENT_BY_FACTOR: Record<string, ScoreComponent> = Object.fromEntries(
  FACTOR_SPECS.map((s) => [s.key, s.component]),
);

export function freshnessDaysFor(factorKey: string): number {
  return FRESHNESS_DAYS[factorKey] ?? DEFAULT_FRESHNESS_DAYS;
}

/** The fresh_until an intake should stamp when the caller doesn't supply one. */
export function defaultFreshUntil(factorKey: string, observedAtIso: string): string {
  const ms = Date.parse(observedAtIso) + freshnessDaysFor(factorKey) * 86_400_000;
  return new Date(ms).toISOString();
}

export type FreshnessState = "FRESH" | "STALE" | "MISSING";

export interface FactorFreshness {
  factor_key: string;
  component: ScoreComponent;
  state: FreshnessState;
  observed_at: string | null;
  fresh_until: string | null;
  ageDays: number | null;
  kind: string | null;
}

export interface EvidenceFreshness {
  opportunity_id: string;
  factors: FactorFreshness[];
  fresh: number;
  stale: number;
  missing: number;
}

/**
 * Per-factor freshness for an opportunity as of `asOf`. A factor is FRESH when its
 * latest observation's effective fresh_until is in the future, STALE when past,
 * MISSING when no numeric observation exists.
 */
export function evidenceFreshness(opportunityId: string, asOf?: string): EvidenceFreshness {
  const now = asOf ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const all = listEvidence(opportunityId); // newest-first

  // latest numeric observation per factor
  const latest = new Map<string, Evidence>();
  for (const e of all) {
    if (e.value_num == null) continue;
    if (!latest.has(e.factor_key)) latest.set(e.factor_key, e);
  }

  const factors: FactorFreshness[] = [];
  let fresh = 0;
  let stale = 0;
  let missing = 0;

  for (const spec of FACTOR_SPECS) {
    const e = latest.get(spec.key);
    if (!e) {
      missing += 1;
      factors.push({ factor_key: spec.key, component: spec.component, state: "MISSING", observed_at: null, fresh_until: null, ageDays: null, kind: null });
      continue;
    }
    const effectiveFreshUntil = e.fresh_until ?? defaultFreshUntil(spec.key, e.observed_at);
    const isFresh = Date.parse(effectiveFreshUntil) >= nowMs;
    if (isFresh) fresh += 1;
    else stale += 1;
    factors.push({
      factor_key: spec.key,
      component: spec.component,
      state: isFresh ? "FRESH" : "STALE",
      observed_at: e.observed_at,
      fresh_until: effectiveFreshUntil,
      ageDays: Math.max(0, Math.round((nowMs - Date.parse(e.observed_at)) / 86_400_000)),
      kind: e.kind,
    });
  }

  return { opportunity_id: opportunityId, factors, fresh, stale, missing };
}

export { COMPONENT_BY_FACTOR };
