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
export {
  integrationStatus,
  ALL_ADAPTERS,
  searchConsoleAdapter,
  ga4Adapter,
  googleAdsAdapter,
  leadsAdapter,
  type AdapterStatus,
  type SearchConsoleAdapter,
  type SearchAnalyticsRow,
  type SearchAnalyticsQuery,
} from "./growth/adapters";

// Reporting
export { buildWeeklyReport, type GrowthReport, type BuiltReport } from "./report";

// ── P1B — Real growth intelligence + activity foundation ─────────────────────

// Lead-performance aggregation (real leads; honest UNKNOWN/UNAVAILABLE)
export {
  getLeadPerformance,
  STATUS_BUCKETS,
  type LeadPerformance,
  type LeadPerformanceFilter,
  type MetricValue,
  type Distribution,
} from "./growth/performance";

// Page-performance model (SEO-registry driven; reusable beyond Augusta)
export {
  buildPagePerformance,
  getPagePerformanceBySlug,
  type PagePerformanceRow,
  type PageType,
  type PageSearchMetrics,
} from "./growth/pageModel";

// Search Console ingestion pipeline (incremental; NOT_CONNECTED today)
export {
  ingestSearchConsole,
  upsertSearchMetrics,
  getIngestionState,
  setIngestionState,
  type IngestResult,
} from "./growth/searchConsole";

// Deterministic growth signals + signal→recommendation generation
export {
  GROWTH_SIGNAL_THRESHOLDS,
  evaluateGrowthSignals,
  generateRecommendationsFromSignals,
  recordSignal,
  listSignals,
  getSignal,
  type SignalInput,
  type SignalEvaluation,
  type RecommendationGeneration,
} from "./growth/signals";

// Lead ↔ page ↔ market ↔ niche mapping
export {
  mapLead,
  resolveMarket,
  resolveNiche,
  marketBySeoSlug,
  nicheBySlug,
  normalizeSlug,
  UNATTRIBUTED,
  UNMAPPED,
  type MappedLead,
  type MarketRef,
  type NicheRef,
} from "./mapping";

// Activity / event audit layer
export {
  recordActivity,
  safeRecordActivity,
  getActivityEvent,
  listRecentActivity,
  listActivityForMarket,
  listActivityForOpportunity,
  listActivityForRecommendation,
  listActivityForExperiment,
  type ActivityInput,
} from "./activity";

// System status
export { getSystemStatus, type SystemStatus, type IntegrationStatusLine } from "./status";

// Worker-facing read facade
export {
  getSystemStatusForWorker,
  getMarketPerformance as getMarketPerformanceForWorker,
  getPagePerformance as getPagePerformanceForWorker,
  getGrowthSignals,
  getRecommendations,
  getRecentActivity,
  getTopOpportunities,
  getOpportunityEvidence,
  generateGrowthRecommendations as generateGrowthRecommendationsFromSignals,
  type GrowthGenerationResult,
} from "./worker";
