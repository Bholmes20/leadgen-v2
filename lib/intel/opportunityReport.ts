// Opportunity Report #1 (P1C, Step 13).
//
// Ranks CITY × NICHE opportunities from STORED evidence — but only once enough
// real evidence exists. If the research isn't there yet it returns status
// RESEARCH_INCOMPLETE rather than inventing precision. Opportunity Score and
// Evidence Confidence are always reported separately.

import db from "../db";
import { listOpportunities, getOpportunity, type OpportunityWithContext } from "./opportunities";
import { getMarket } from "./markets";
import { getNiche } from "./niches";
import { analyzeOpportunity, type OpportunityAnalysis, type DimensionAnalysis } from "./scoringV2";
import { getResearchTaskByOpportunity, missingDimensions } from "./research";
import { evidenceFreshness, type FactorFreshness } from "./freshness";
import { listEvidence } from "./evidence";
import { listSignals } from "./growth/signals";
import { listRecommendations } from "./recommendations";
import { getSeoConnection, getTopPages, type SeoPageRow } from "./growth/seoAnalytics";
import { mapLead, marketBySeoSlug, nicheBySlug } from "./mapping";
import { safeRecordActivity } from "./activity";
import type { ConnectionState, Recommendation, ScoreComponent, Signal } from "./types";

export interface OpportunityReportRow {
  rank: number | null; // null when the report is RESEARCH_INCOMPLETE
  opportunity_id: string;
  market: string; // "Augusta, GA"
  niche: string;
  opportunityScore: number | null;
  evidenceConfidence: number;
  evidenceConfidenceLabel: string;
  dimensions: Record<ScoreComponent, number | null>;
  dimensionsResearched: number;
  totalDimensions: number;
  researchComplete: boolean;
  keyEvidence: string[];
  majorRisks: string[];
  missingEvidence: string[]; // missing/stale factor keys + un-started dimensions
  recommendedNextAction: string;
}

export interface OpportunityReport {
  generatedAt: string;
  status: "READY" | "RESEARCH_INCOMPLETE";
  readyCount: number;
  neededForRanking: number;
  totalCandidates: number;
  rows: OpportunityReportRow[]; // always present (progress view)
  top5: OpportunityReportRow[]; // empty until READY
  challenger: OpportunityReportRow | null; // one market/niche to validate beside the baseline
  message: string;
}

export interface ReportOptions {
  minReadyForRanking?: number; // default 15 (spec: rank ~15-25)
  asOf?: string;
  baselineCity?: string; // excluded from challenger pick (the live market)
}

function nextAction(a: OpportunityAnalysis): string {
  if (!a.researchComplete) {
    const openDims = a.dimensions.filter((d) => !d.researched).map((d) => d.component);
    return openDims.length
      ? `Complete research: ${openDims.join(", ")}`
      : "Raise evidence confidence (upgrade estimates to facts / refresh stale evidence)";
  }
  switch (a.verdict) {
    case "VALIDATE":
      return "Validate with a small real test beside the baseline market";
    case "RESEARCH_MORE":
      return "Gather more evidence before committing";
    default:
      return "Deprioritize for now";
  }
}

function buildRow(o: OpportunityWithContext, a: OpportunityAnalysis): OpportunityReportRow {
  const keyEvidence = a.dimensions.filter((d) => d.score != null && d.score >= 70).map((d) => `${d.component} strong (${d.score})`);
  const majorRisks = a.dimensions.filter((d) => d.researched && d.score != null && d.score <= 45).map((d) => `${d.component} weak (${d.score})`);
  const task = getResearchTaskByOpportunity(o.id);
  const openDims = task ? missingDimensions(task) : a.dimensions.filter((d) => !d.researched).map((d) => d.component);
  const staleOrMissing = a.dimensions.flatMap((d) => [...d.missingFactors, ...d.staleFactors]);
  const missingEvidence = [...new Set([...openDims, ...staleOrMissing])];

  return {
    rank: null,
    opportunity_id: o.id,
    market: `${o.market_city}, ${o.market_state}`,
    niche: o.niche_label,
    opportunityScore: a.score,
    evidenceConfidence: a.evidenceConfidence,
    evidenceConfidenceLabel: a.evidenceConfidenceLabel,
    dimensions: a.components,
    dimensionsResearched: a.dimensionsResearched,
    totalDimensions: a.totalDimensions,
    researchComplete: a.researchComplete,
    keyEvidence,
    majorRisks,
    missingEvidence,
    recommendedNextAction: nextAction(a),
  };
}

/**
 * Build Opportunity Report #1. Deterministic. Returns RESEARCH_INCOMPLETE (with a
 * progress view) until at least `minReadyForRanking` opportunities have complete,
 * confident research — "research incomplete" is preferable to fake precision.
 */
export function generateOpportunityReport(opts: ReportOptions = {}): OpportunityReport {
  const generatedAt = opts.asOf ?? new Date().toISOString();
  const minReady = opts.minReadyForRanking ?? 15;
  const baselineCity = opts.baselineCity ?? "Augusta";

  const opps = listOpportunities().filter((o) => o.stage !== "REJECTED");
  const analyzed = opps.map((o) => ({ o, a: analyzeOpportunity(o.id, opts.asOf) }));

  const rows = analyzed
    .map(({ o, a }) => buildRow(o, a))
    .sort((x, y) => (y.opportunityScore ?? -1) - (x.opportunityScore ?? -1));

  const ready = analyzed.filter(({ a }) => a.researchComplete);
  const status: OpportunityReport["status"] = ready.length >= minReady ? "READY" : "RESEARCH_INCOMPLETE";

  let top5: OpportunityReportRow[] = [];
  let challenger: OpportunityReportRow | null = null;

  if (status === "READY") {
    const ranked = rows
      .filter((r) => r.researchComplete)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    top5 = ranked.slice(0, 5);
    challenger = ranked.find((r) => !r.market.startsWith(`${baselineCity},`)) ?? null;
    // Reflect ranks back onto the returned rows for ready candidates.
    for (const r of rows) {
      const m = ranked.find((x) => x.opportunity_id === r.opportunity_id);
      if (m) r.rank = m.rank;
    }
  }

  const message =
    status === "READY"
      ? `Ranked ${ready.length} researched opportunities; top ${top5.length} identified.`
      : `RESEARCH INCOMPLETE — ${ready.length}/${minReady} opportunities have complete, confident research. No ranking is produced to avoid fake precision.`;

  safeRecordActivity({
    event_type: "REPORT_GENERATED",
    actor_type: "system",
    actor_name: "opportunity-report",
    target_type: "report",
    target_id: "opportunity-report-1",
    title: `Opportunity report: ${status}`,
    summary: message,
    metadata: { status, readyCount: ready.length, totalCandidates: analyzed.length, minReady },
    severity: "info",
  });

  return {
    generatedAt,
    status,
    readyCount: ready.length,
    neededForRanking: minReady,
    totalCandidates: analyzed.length,
    rows,
    top5,
    challenger,
    message,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-opportunity Opportunity Report (P1C, Step 13b) — "Why are we considering
// Aiken?". Given ONE market × niche, assemble a single structured explanation:
// score & confidence (kept separate), component + per-dimension analysis,
// provenance-tagged evidence, freshness, the SEO performance mapped to it, the
// leads attributed to it, active signals, linked recommendations, what's missing,
// and the deterministic reasons. This exposes structured FACTS — never
// chain-of-thought — so James/Alfred/Slack can be answered with evidence.
// ─────────────────────────────────────────────────────────────────────────────

export interface OpportunityEvidenceItem {
  factor_key: string;
  kind: string; // FACT | ESTIMATE | INFERENCE | UNKNOWN
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  source_url: string | null;
  observed_at: string;
  fresh_until: string | null;
  stale: boolean; // fresh_until in the past relative to asOf
  confidence: number | null; // researcher's own confidence in this datum
  author: string | null;
}

export interface OpportunityExplanation {
  opportunity_id: string;
  market: string; // "Aiken, SC"
  niche: string; // niche label
  stage: string;
  // Attractiveness and trust are ALWAYS reported separately.
  opportunityScore: number | null;
  evidenceConfidence: number; // 0-100
  evidenceConfidenceLabel: string; // Low | Medium | High
  verdict: string;
  researchComplete: boolean;
  components: Record<ScoreComponent, number | null>;
  dimensions: DimensionAnalysis[]; // per-component: researched / missing / stale
  freshness: { fresh: number; stale: number; missing: number; factors: FactorFreshness[] };
  evidence: OpportunityEvidenceItem[]; // provenance-first, newest-first
  seo: { connection: ConnectionState; hasData: boolean; pages: SeoPageRow[] };
  leads: { attributedLeads: number; marketLeads: number }; // MEASURED from the CRM
  activeSignals: Signal[]; // open signals scoped to this market × niche
  recommendations: Recommendation[]; // PROPOSED recs linked to this opportunity
  missingEvidence: string[]; // missing/stale factor keys
  reasons: string[]; // deterministic scorer reasons (facts, not reasoning traces)
}

/** Leads attributed to a market × niche, via the same honest mapping the rest of
 * the system uses (unmapped leads simply don't match — never force-fit). */
function opportunityLeadEvidence(marketId: string, nicheId: string): { attributedLeads: number; marketLeads: number } {
  const rows = db
    .prepare("SELECT city, niche, source_page FROM leads")
    .all() as { city: string | null; niche: string | null; source_page: string | null }[];
  const markets = marketBySeoSlug();
  const niches = nicheBySlug();
  let attributedLeads = 0;
  let marketLeads = 0;
  for (const r of rows) {
    const m = mapLead({ city: r.city, niche: r.niche, source_page: r.source_page }, markets, niches);
    if (m.market?.id !== marketId) continue;
    marketLeads += 1;
    if (m.niche?.id === nicheId) attributedLeads += 1;
  }
  return { attributedLeads, marketLeads };
}

/**
 * Build the single-opportunity explanation. Deterministic; `asOf` is injectable
 * for tests. Reads only — records nothing, mutates nothing.
 */
export function getOpportunityReport(opportunityId: string, opts: { asOf?: string } = {}): OpportunityExplanation {
  const opp = getOpportunity(opportunityId);
  if (!opp) throw new Error(`Unknown opportunity: ${opportunityId}`);
  const nowIso = opts.asOf ?? new Date().toISOString();

  const market = getMarket(opp.market_id);
  const niche = getNiche(opp.niche_id);
  const a = analyzeOpportunity(opportunityId, opts.asOf);
  const fresh = evidenceFreshness(opportunityId, opts.asOf);

  const evidence: OpportunityEvidenceItem[] = listEvidence(opportunityId).map((e) => ({
    factor_key: e.factor_key,
    kind: e.kind,
    value_num: e.value_num,
    value_text: e.value_text,
    unit: e.unit,
    source_url: e.source_url,
    observed_at: e.observed_at,
    fresh_until: e.fresh_until,
    stale: e.fresh_until != null && e.fresh_until < nowIso,
    confidence: e.confidence,
    author: e.author,
  }));

  // Signals scoped to this market × niche (SEO page signals carry both ids).
  const activeSignals = listSignals("OPEN").filter(
    (s) => s.market_id === opp.market_id && s.niche_id === opp.niche_id,
  );
  // Recommendations deterministically linked by target: this opportunity id, or a
  // target one of its active signals points at (page slug / query).
  const linkTargets = new Set<string>([opportunityId, ...activeSignals.map((s) => s.target)]);
  const recommendations = listRecommendations().filter((r) => linkTargets.has(r.target));

  // SEO performance mapped to this market × niche — honest connection state; empty
  // (not fabricated) until Search Console is connected and has ingested rows.
  const connection = getSeoConnection();
  const pages =
    connection === "CONNECTED"
      ? getTopPages(28, 200, opts.asOf).filter(
          (p) => p.marketId === opp.market_id && p.nicheId === opp.niche_id,
        )
      : [];

  const missingEvidence = [...new Set(a.dimensions.flatMap((d) => [...d.missingFactors, ...d.staleFactors]))];

  return {
    opportunity_id: opportunityId,
    market: market ? `${market.city}, ${market.state}` : "(unknown market)",
    niche: niche?.label ?? "(unknown niche)",
    stage: opp.stage,
    opportunityScore: a.score,
    evidenceConfidence: a.evidenceConfidence,
    evidenceConfidenceLabel: a.evidenceConfidenceLabel,
    verdict: a.verdict,
    researchComplete: a.researchComplete,
    components: a.components,
    dimensions: a.dimensions,
    freshness: { fresh: fresh.fresh, stale: fresh.stale, missing: fresh.missing, factors: fresh.factors },
    evidence,
    seo: { connection, hasData: pages.length > 0, pages },
    leads: opportunityLeadEvidence(opp.market_id, opp.niche_id),
    activeSignals,
    recommendations,
    missingEvidence,
    reasons: a.reasons,
  };
}
