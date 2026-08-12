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
import type { ActivityEvent, Evidence, Recommendation, RecommendationStatus, Signal, SignalStatus } from "./types";

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
