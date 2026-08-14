// Opportunity Scoring V2 (P1C, Step 12).
//
// Scoring stays deterministic and lives in code (scoring.ts), NEVER in a prompt.
// V2 adds a freshness-aware, per-dimension analysis and keeps two numbers strictly
// separate:
//   • Opportunity Score  — how attractive the evidence looks (0-100)
//   • Evidence Confidence — how much we should trust that picture (coverage ×
//                           provenance quality), reported as Low/Medium/High
// "86/100, MEDIUM confidence" means "looks attractive, but research is incomplete"
// — NOT "86% sure this will succeed".

import { getOpportunity } from "./opportunities";
import { resolveFactors } from "./evidence";
import { scoreOpportunity } from "./scoring";
import { evidenceFreshness } from "./freshness";
import { SCORE_COMPONENTS } from "./types";
import type { ConfidenceLabel, ScoreComponent, ScoreVerdict } from "./types";

export interface DimensionAnalysis {
  component: ScoreComponent;
  score: number | null;
  factorsUsed: string[];
  missingFactors: string[];
  staleFactors: string[];
  researched: boolean; // has ≥1 fresh factor
}

export interface OpportunityAnalysis {
  opportunity_id: string;
  score: number | null; // attractiveness (separate from confidence)
  components: Record<ScoreComponent, number | null>;
  dimensions: DimensionAnalysis[];
  evidenceConfidence: number; // 0-100, separate from score
  evidenceConfidenceLabel: ConfidenceLabel;
  freshFactors: number;
  staleFactors: number;
  missingFactors: number;
  dimensionsResearched: number;
  totalDimensions: number;
  researchComplete: boolean;
  verdict: ScoreVerdict;
  reasons: string[];
}

// Minimum evidence confidence for an opportunity to count as "researched enough".
export const RESEARCH_COMPLETE_MIN_CONFIDENCE = 40; // Medium+

/**
 * Analyze one opportunity: deterministic score + per-dimension coverage/freshness
 * + a separate evidence-confidence read + a researchComplete flag. `asOf` is
 * injectable for deterministic tests.
 */
export function analyzeOpportunity(opportunityId: string, asOf?: string): OpportunityAnalysis {
  if (!getOpportunity(opportunityId)) throw new Error(`Unknown opportunity: ${opportunityId}`);

  const factors = resolveFactors(opportunityId, asOf); // already excludes stale
  const score = scoreOpportunity(factors);
  const fresh = evidenceFreshness(opportunityId, asOf);

  const staleByComponent = new Map<ScoreComponent, string[]>();
  for (const f of fresh.factors) {
    if (f.state !== "STALE") continue;
    const arr = staleByComponent.get(f.component) ?? [];
    arr.push(f.factor_key);
    staleByComponent.set(f.component, arr);
  }
  const freshKeys = new Set(fresh.factors.filter((f) => f.state === "FRESH").map((f) => f.factor_key));

  const dimensions: DimensionAnalysis[] = SCORE_COMPONENTS.map((component) => {
    const detail = score.componentDetail.find((d) => d.component === component)!;
    const researched = detail.factorsUsed.some((k) => freshKeys.has(k));
    return {
      component,
      score: detail.score,
      factorsUsed: detail.factorsUsed,
      missingFactors: detail.missingFactors,
      staleFactors: staleByComponent.get(component) ?? [],
      researched,
    };
  });

  const dimensionsResearched = dimensions.filter((d) => d.researched).length;
  const researchComplete =
    dimensionsResearched === SCORE_COMPONENTS.length &&
    score.confidence >= RESEARCH_COMPLETE_MIN_CONFIDENCE;

  return {
    opportunity_id: opportunityId,
    score: score.overall,
    components: score.components,
    dimensions,
    evidenceConfidence: score.confidence,
    evidenceConfidenceLabel: score.confidenceLabel,
    freshFactors: fresh.fresh,
    staleFactors: fresh.stale,
    missingFactors: fresh.missing,
    dimensionsResearched,
    totalDimensions: SCORE_COMPONENTS.length,
    researchComplete,
    verdict: score.verdict,
    reasons: score.reasons,
  };
}
