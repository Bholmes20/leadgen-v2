// ─────────────────────────────────────────────────────────────────────────────
// Opportunity + Growth Intelligence — public, worker-ready API.
//
// The admin UI and any future Marketing/Growth Worker call THESE functions — the
// business logic lives here, never inside React components. A worker never needs
// to scrape the dashboard; it operates the system through this surface.
// ─────────────────────────────────────────────────────────────────────────────

export * from "./types";

// Scoring (pure, deterministic, explainable)
export {
  scoreOpportunity,
  FACTOR_SPECS,
  COMPONENT_WEIGHTS,
  KNOWN_FACTOR_KEYS,
  type ScoreResult,
  type ComponentResult,
  type FactorMap,
  type FactorValue,
} from "./scoring";

// Research universe
export { upsertMarket, getMarket, findMarket, listMarkets, type MarketInput } from "./markets";
export { upsertNiche, getNiche, findNiche, listNiches, type NicheInput } from "./niches";

// Evidence ledger (provenance-first)
export { recordEvidence, listEvidence, resolveFactors, type EvidenceInput } from "./evidence";

// Opportunity engine
export {
  discoverOpportunity,
  getOpportunity,
  listOpportunities,
  listTopOpportunities,
  scoreOpportunityById,
  transitionOpportunity,
  parseComponents,
  parseReasons,
  type OpportunityWithContext,
  type TransitionOptions,
} from "./opportunities";

// Experiments (real results eventually outrank the research score)
export {
  createExperiment,
  getExperiment,
  listExperiments,
  updateExperimentStatus,
  recordExperimentMetrics,
  summarizeExperiment,
  type ExperimentInput,
  type MetricInput,
  type ExperimentSummary,
} from "./experiments";

// Recommendation queue
export {
  createRecommendation,
  getRecommendation,
  listRecommendations,
  approveRecommendation,
  updateRecommendationStatus,
  recordRecommendationOutcome,
  type RecommendationInput,
} from "./recommendations";

// Approval boundaries
export {
  requiredLevel,
  assertApproval,
  logDecision,
  listDecisions,
  ApprovalRequiredError,
  type ApprovalContext,
} from "./permissions";

// Growth engine
export {
  getPagePerformance,
  getMarketPerformance,
  generateGrowthRecommendations,
  recordPerformanceSnapshot,
  GROWTH_THRESHOLDS,
  type CombinedPageStat,
  type MarketPerformance,
  type GrowthAnalysis,
} from "./growth";
export { integrationStatus, ALL_ADAPTERS, type AdapterStatus } from "./growth/adapters";

// Reporting
export { buildWeeklyReport, type GrowthReport, type BuiltReport } from "./report";
