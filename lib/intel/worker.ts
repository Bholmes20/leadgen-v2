// Worker-facing read interface (P1B, Step 10).
//
// The future Marketing/Growth Worker (operated by James) drives the system
// through THIS surface — the same services the dashboard uses, no screen
// scraping. Everything here is READ or RECOMMEND level. Mutations that require
// approval (approveRecommendation, transitionOpportunity to gated stages, spend,
// publish, deploy) are intentionally NOT exposed here; they stay behind the
// permission layer in their own modules and require an explicit approver.

import { getSystemStatus, type SystemStatus } from "./status";
import { getLeadPerformance, type LeadPerformance, type LeadPerformanceFilter } from "./growth/performance";
import { buildPagePerformance, getPagePerformanceBySlug, type PagePerformanceRow } from "./growth/pageModel";
import {
  evaluateGrowthSignals,
  generateRecommendationsFromSignals,
  listSignals,
  type RecommendationGeneration,
  type SignalEvaluation,
} from "./growth/signals";
import { listRecommendations } from "./recommendations";
import { listRecentActivity } from "./activity";
import { listTopOpportunities, type OpportunityWithContext } from "./opportunities";
import { listEvidence } from "./evidence";
// P1C surfaces
import {
  getSeoPerformance as getSeoPerformanceRaw,
  getTopQueries as getTopQueriesRaw,
  getTopPages as getTopPagesRaw,
  type SeoPerformance,
  type SeoQueryRow,
  type SeoPageRow,
} from "./growth/seoAnalytics";
import { evaluateSeoSignals, ALL_SEO_SIGNALS, type SeoSignalEvaluation } from "./growth/seoSignals";
import {
  createResearchTask as createResearchTaskRaw,
  getResearchQueue as getResearchQueueRaw,
  recordResearchEvidence as recordResearchEvidenceRaw,
  completeResearchDimension as completeResearchDimensionRaw,
  type CreateResearchTaskInput,
  type ResearchEvidenceInput,
} from "./research";
import { analyzeOpportunity, type OpportunityAnalysis } from "./scoringV2";
import {
  generateOpportunityReport as generateOpportunityReportRaw,
  getOpportunityReport as getOpportunityReportRaw,
  type OpportunityReport,
  type OpportunityExplanation,
} from "./opportunityReport";
import { ingestSearchConsole } from "./growth/searchConsole";
import type {
  ActivityEvent,
  ConnectionState,
  Evidence,
  Recommendation,
  RecommendationStatus,
  ResearchTask,
  ResearchTaskStatus,
  ScoreComponent,
  Signal,
  SignalStatus,
} from "./types";

export function getSystemStatusForWorker(): SystemStatus {
  return getSystemStatus();
}

/** Lead performance, optionally scoped to one market (lib/seo city slug). */
export function getMarketPerformance(market?: string): LeadPerformance {
  const filter: LeadPerformanceFilter = market ? { market } : {};
  return getLeadPerformance(filter);
}

/** All page performance, or a single page by slug/path. */
export function getPagePerformance(page?: string): PagePerformanceRow[] | PagePerformanceRow | null {
  return page ? getPagePerformanceBySlug(page) : buildPagePerformance();
}

export function getGrowthSignals(status: SignalStatus = "OPEN"): Signal[] {
  return listSignals(status);
}

export function getRecommendations(status?: RecommendationStatus): Recommendation[] {
  return listRecommendations(status);
}

export function getRecentActivity(limit = 50): ActivityEvent[] {
  return listRecentActivity(limit);
}

export function getTopOpportunities(limit = 10): OpportunityWithContext[] {
  return listTopOpportunities(limit);
}

export function getOpportunityEvidence(opportunityId: string): Evidence[] {
  return listEvidence(opportunityId);
}

export interface GrowthGenerationResult {
  signals: SignalEvaluation;
  recommendations: RecommendationGeneration;
}

/**
 * The worker's one-shot "analyze and propose" entry point (RECOMMEND level).
 * Deterministically re-evaluates signals from real data, then converts them into
 * PROPOSED recommendations. Nothing is executed or approved automatically.
 */
export function generateGrowthRecommendations(opts: { now?: string } = {}): GrowthGenerationResult {
  const signals = evaluateGrowthSignals(opts);
  const recommendations = generateRecommendationsFromSignals();
  return { signals, recommendations };
}

// ── P1C — SEO + research worker surface (READ / RESEARCH / RECOMMEND) ─────────

export function getSeoPerformance(days = 28): SeoPerformance {
  return getSeoPerformanceRaw(days);
}

export function getTopQueries(days = 28, limit = 25): SeoQueryRow[] {
  return getTopQueriesRaw(days, limit);
}

export function getTopPages(days = 28, limit = 20): SeoPageRow[] {
  return getTopPagesRaw(days, limit);
}

const SEO_SIGNAL_SET = new Set<string>(ALL_SEO_SIGNALS);

/** Open signals that are SEO/Search-Console derived. */
export function getSeoSignals(): Signal[] {
  return listSignals("OPEN").filter((s) => SEO_SIGNAL_SET.has(s.signal_type));
}

const SEO_REC_TYPES = new Set<string>([
  "OPTIMIZE_PAGE_METADATA",
  "IMPROVE_EXISTING_PAGE",
  "EXPAND_INTERNAL_LINKING",
  "IMPROVE_CRO",
  "EXPAND_ACQUISITION",
  "CREATE_SUPPORTING_CONTENT",
  "CONSOLIDATE_OVERLAP",
  "MONITOR_WINNER",
  "INVESTIGATE_PAGE",
]);

/** Proposed recommendations that came from SEO signals. */
export function getSeoRecommendations(): Recommendation[] {
  return listRecommendations("PROPOSED").filter((r) => SEO_REC_TYPES.has(r.type));
}

/** Analyze + propose from Search Console signals (RECOMMEND level). */
export function runSeoAnalysis(opts: { now?: string } = {}): {
  signals: SeoSignalEvaluation;
  recommendations: RecommendationGeneration;
} {
  const signals = evaluateSeoSignals(opts);
  const recommendations = generateRecommendationsFromSignals();
  return { signals, recommendations };
}

export interface SeoInsights {
  connection: ConnectionState;
  performance: SeoPerformance;
  topPages: SeoPageRow[];
  topQueries: SeoQueryRow[];
  signals: Signal[]; // open SEO signals
  recommendations: Recommendation[]; // PROPOSED SEO recs
}

/**
 * One consolidated SEO read for a worker/dashboard: connection state, baseline
 * performance, top pages/queries, open SEO signals, and proposed SEO recs.
 * Pages/queries are empty (not fabricated) until Search Console has real rows.
 */
export function getSEOInsights(days = 28): SeoInsights {
  const performance = getSeoPerformanceRaw(days);
  return {
    connection: performance.connection,
    performance,
    topPages: performance.hasData ? getTopPagesRaw(days, 20) : [],
    topQueries: performance.hasData ? getTopQueriesRaw(days, 25) : [],
    signals: getSeoSignals(),
    recommendations: getSeoRecommendations(),
  };
}

/** Trigger one Search Console ingest (no-op NOT_CONNECTED until credentials set). */
export function runGscIngestion(opts: { now?: string; lookbackDays?: number } = {}) {
  return ingestSearchConsole(opts);
}

// ── Research (RESEARCH level) ────────────────────────────────────────────────
export function createResearchTask(input: CreateResearchTaskInput): ResearchTask {
  return createResearchTaskRaw(input);
}
export function getResearchQueue(status?: ResearchTaskStatus): ResearchTask[] {
  return getResearchQueueRaw(status);
}
export function recordResearchEvidence(input: ResearchEvidenceInput): Evidence {
  return recordResearchEvidenceRaw(input);
}
export function completeResearchDimension(opportunityId: string, dimension: ScoreComponent, actor?: string): ResearchTask {
  return completeResearchDimensionRaw(opportunityId, dimension, actor);
}

// ── Scoring V2 + report (READ) ───────────────────────────────────────────────
/** Scoring V2 analysis: score + evidence-confidence (separate) + freshness. */
export function scoreOpportunity(opportunityId: string): OpportunityAnalysis {
  return analyzeOpportunity(opportunityId);
}
export function generateOpportunityReport(): OpportunityReport {
  return generateOpportunityReportRaw();
}
/** Per-opportunity structured explanation ("Why are we considering Aiken?"). */
export function getOpportunityReport(opportunityId: string): OpportunityExplanation {
  return getOpportunityReportRaw(opportunityId);
}
