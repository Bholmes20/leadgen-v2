// ─────────────────────────────────────────────────────────────────────────────
// Opportunity + Growth Intelligence — shared types (P1A)
//
// This layer sits UPSTREAM of the SEO page factory: it discovers, researches,
// scores, and recommends city × niche markets. It NEVER publishes pages, spends
// money, or deploys — those stay behind explicit human/James approval.
//
// Design principles baked into these types:
//   • Evidence is preserved, not reduced to one number. Every research
//     observation records its `kind` (fact vs estimate vs inference vs unknown),
//     provenance, and freshness so a score is always explainable and re-derivable.
//   • The scoring model is deterministic and lives in code (lib/intel/scoring.ts),
//     never inside an AI prompt.
//   • Tables are namespaced `intel_*` to avoid any collision with the existing
//     per-lead sales `opportunities` table in lib/db.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ── Evidence provenance ──────────────────────────────────────────────────────
// The single most important distinction in the whole system: never let an
// invented value masquerade as a measured one.
export const EVIDENCE_KINDS = ["FACT", "ESTIMATE", "INFERENCE", "UNKNOWN"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

// Relative trust each kind contributes to a confidence calculation. FACT is
// observed/measured; ESTIMATE is a reasoned number; INFERENCE is derived from
// weak signal; UNKNOWN contributes nothing but is recorded so gaps are visible.
export const EVIDENCE_KIND_TRUST: Record<EvidenceKind, number> = {
  FACT: 1,
  ESTIMATE: 0.6,
  INFERENCE: 0.4,
  UNKNOWN: 0,
};

// ── Opportunity lifecycle ────────────────────────────────────────────────────
export const OPPORTUNITY_STAGES = [
  "DISCOVERED",
  "RESEARCHING",
  "SCORED",
  "REVIEW",
  "APPROVED_FOR_TEST",
  "TESTING",
  "VALIDATED",
  "SCALE",
  "REJECTED",
  "PAUSED",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

// Explicit transition map. A stage may always be PAUSED or REJECTED (except from
// terminal SCALE). PAUSED can resume to RESEARCHING. This is enforced in
// opportunities.ts and every transition is logged to intel_decisions.
export const STAGE_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  DISCOVERED: ["RESEARCHING", "REJECTED", "PAUSED"],
  RESEARCHING: ["SCORED", "REJECTED", "PAUSED"],
  SCORED: ["REVIEW", "RESEARCHING", "REJECTED", "PAUSED"],
  REVIEW: ["APPROVED_FOR_TEST", "RESEARCHING", "REJECTED", "PAUSED"],
  APPROVED_FOR_TEST: ["TESTING", "REJECTED", "PAUSED"],
  TESTING: ["VALIDATED", "REJECTED", "PAUSED"],
  VALIDATED: ["SCALE", "REJECTED", "PAUSED"],
  SCALE: ["PAUSED"],
  REJECTED: ["RESEARCHING"], // allow revisiting a previously-rejected market
  PAUSED: ["RESEARCHING", "REJECTED"],
};

// Transitions that are consequential and therefore require APPROVAL_REQUIRED.
// (Publishing/spend themselves are out of scope for P1A, but approving a market
// for a paid test is a gated decision even now.)
export const APPROVAL_GATED_TRANSITIONS: ReadonlyArray<OpportunityStage> = [
  "APPROVED_FOR_TEST",
  "SCALE",
];

// ── Scoring component keys ───────────────────────────────────────────────────
export const SCORE_COMPONENTS = [
  "demand",
  "competition",
  "economics",
  "fulfillment",
  "acquisition",
  "strategic",
] as const;
export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];

export const CONFIDENCE_LABELS = ["Low", "Medium", "High"] as const;
export type ConfidenceLabel = (typeof CONFIDENCE_LABELS)[number];

// The deterministic recommendation the scorer emits. NOTE: nothing is ever
// auto-scaled from a research score alone — the strongest research verdict is
// "validate with a real test". Real experiment results outrank the score later.
export const SCORE_VERDICTS = ["VALIDATE", "RESEARCH_MORE", "DEPRIORITIZE"] as const;
export type ScoreVerdict = (typeof SCORE_VERDICTS)[number];

// ── Recommendation model ─────────────────────────────────────────────────────
export const RECOMMENDATION_TYPES = [
  "OPTIMIZE_PAGE",
  "CREATE_CONTENT",
  "IMPROVE_INTERNAL_LINKING",
  "INVESTIGATE_QUERY",
  "TEST_MARKET",
  "TEST_NICHE",
  "PAUSE_MARKET",
  "EXPAND_MARKET",
  "TEST_PAID_TRAFFIC",
  "INVESTIGATE_COMPETITOR",
  "IMPROVE_CONVERSION",
  "REVIEW_PRICING",
  "REVIEW_PROVIDER_CAPACITY",
  "REFACTOR_FOR_REPLICATION", // tracks the Augusta-hardcoding blockers from the audit
  "FIX_ATTRIBUTION", // P1B: unmapped/unattributed leads need attribution wiring fixed
  "INVESTIGATE_PAGE", // P1B: a page losing visibility / underperforming needs a look
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const RECOMMENDATION_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "DEFERRED",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

// ── Permission levels (approval boundaries) ──────────────────────────────────
// READ:               a worker may do this automatically
// RECOMMEND:          a worker may create a recommendation
// APPROVAL_REQUIRED:  James/owner must approve before it happens
// EXECUTE:            an already-approved action may be carried out
export const PERMISSION_LEVELS = ["READ", "RECOMMEND", "APPROVAL_REQUIRED", "EXECUTE"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

// Named capabilities and the level required to perform them. Used by
// assertApproval() so both the UI and a future worker share one rule set.
export const CAPABILITY_LEVELS = {
  discover_opportunities: "READ",
  score_opportunity: "READ",
  record_evidence: "READ",
  generate_recommendations: "RECOMMEND",
  create_recommendation: "RECOMMEND",
  create_experiment: "RECOMMEND",
  record_experiment_metrics: "READ",
  approve_for_test: "APPROVAL_REQUIRED",
  approve_recommendation: "APPROVAL_REQUIRED",
  publish_market: "APPROVAL_REQUIRED",
  publish_pages: "APPROVAL_REQUIRED",
  spend_ad_budget: "APPROVAL_REQUIRED",
  change_pricing: "APPROVAL_REQUIRED",
  change_providers: "APPROVAL_REQUIRED",
  deploy_production: "APPROVAL_REQUIRED",
  delete_production_data: "APPROVAL_REQUIRED",
  scale_market: "APPROVAL_REQUIRED",
} as const;
export type Capability = keyof typeof CAPABILITY_LEVELS;

// ── Experiments ──────────────────────────────────────────────────────────────
export const EXPERIMENT_STATUSES = [
  "PLANNED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "ABORTED",
] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const ACQUISITION_CHANNELS = [
  "seo",
  "google_ads",
  "meta_ads",
  "local_service_ads",
  "referral",
  "other",
] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

// ── Growth-engine adapter sources ────────────────────────────────────────────
export const PERFORMANCE_SOURCES = ["gsc", "ga4", "google_ads", "leads"] as const;
export type PerformanceSource = (typeof PERFORMANCE_SOURCES)[number];

export const PERFORMANCE_SCOPES = ["page", "market", "query"] as const;
export type PerformanceScope = (typeof PERFORMANCE_SCOPES)[number];

// ── Row shapes ───────────────────────────────────────────────────────────────
export interface Market {
  id: string;
  created_at: string;
  city: string;
  state: string; // free text — deliberately NOT the SEO factory's GA|SC union
  metro: string | null;
  county: string | null;
  population: number | null;
  context: string | null;
  seo_city_slug: string | null; // link to lib/seo CITIES when this market is live
  is_seed: number; // 1 = seeded universe entry, not researched
}

export interface Niche {
  id: string;
  created_at: string;
  slug: string;
  label: string;
  lead_service: string | null; // link to CRM leads.service when applicable
  seasonality: string | null;
  ticket_band_low: number | null;
  ticket_band_high: number | null;
  margin_band_low: number | null;
  margin_band_high: number | null;
  recurring_b2b: number; // 0/1 flag
  notes: string | null;
  is_seed: number;
}

export interface Opportunity {
  id: string;
  created_at: string;
  updated_at: string;
  market_id: string;
  niche_id: string;
  stage: OpportunityStage;
  // Denormalized snapshot of the latest scoring run (source of truth = evidence).
  score_overall: number | null;
  score_components: string | null; // JSON: Record<ScoreComponent, number>
  score_reasons: string | null; // JSON: string[]
  confidence: number | null;
  confidence_label: ConfidenceLabel | null;
  verdict: ScoreVerdict | null;
  scored_at: string | null;
  notes: string | null;
}

export interface Evidence {
  id: string;
  created_at: string;
  opportunity_id: string | null;
  market_id: string | null;
  niche_id: string | null;
  factor_key: string;
  value_num: number | null;
  value_text: string | null;
  kind: EvidenceKind;
  confidence: number | null; // 0-100, researcher's own confidence in this datum
  unit: string | null;
  source_url: string | null;
  observed_at: string;
  fresh_until: string | null; // after this, treat the datum as stale
  author: string | null; // who/what recorded it (worker id, human, etc.)
  notes: string | null;
}

export interface Competitor {
  id: string;
  created_at: string;
  opportunity_id: string;
  name: string;
  website: string | null;
  review_count: number | null;
  rating: number | null;
  domain_notes: string | null;
  serp_position: number | null;
  maps_position: number | null;
  quality_score: number | null; // 0-100 subjective website/brand quality
  observed_at: string;
  source_url: string | null;
}

export interface Experiment {
  id: string;
  created_at: string;
  opportunity_id: string;
  hypothesis: string;
  channel: AcquisitionChannel;
  test_budget: number | null; // cents
  start_date: string | null;
  end_date: string | null;
  landing_pages: string | null; // JSON: string[] of factory slugs
  status: ExperimentStatus;
  outcome: string | null;
  lessons: string | null;
}

export interface ExperimentMetric {
  id: string;
  experiment_id: string;
  as_of: string;
  source: PerformanceSource;
  impressions: number | null;
  clicks: number | null;
  sessions: number | null;
  calls: number | null;
  forms: number | null;
  qualified_leads: number | null;
  quotes: number | null;
  booked_jobs: number | null;
  revenue: number | null; // cents
  contractor_cost: number | null; // cents
  ad_spend: number | null; // cents
  created_at: string;
}

export interface Recommendation {
  id: string;
  created_at: string;
  type: RecommendationType;
  target: string; // e.g. opportunity id, page slug, market
  reason: string;
  evidence: string | null; // JSON blob of supporting data
  expected_impact: string | null;
  confidence: number | null;
  priority: Priority;
  effort: string | null;
  est_cost: number | null; // cents
  status: RecommendationStatus;
  reviewed_at: string | null;
  approved_by: string | null;
  outcome: string | null;
  dedup_key: string | null; // stable identity so re-generation upserts, not duplicates
}

export interface Decision {
  id: string;
  created_at: string;
  actor: string;
  subject_type: string; // 'opportunity' | 'recommendation' | ...
  subject_id: string;
  action: string;
  from_state: string | null;
  to_state: string | null;
  permission_level: PermissionLevel;
  rationale: string | null;
}

export interface PerformanceSnapshot {
  id: string;
  created_at: string;
  scope: PerformanceScope;
  identifier: string; // page slug / market id / query text
  source: PerformanceSource;
  as_of: string;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  position: number | null;
  sessions: number | null;
  conversions: number | null;
  cost: number | null; // cents
}

// ─────────────────────────────────────────────────────────────────────────────
// P1B — Data-quality labels
//
// Every derived metric or signal is tagged so a reader (or worker, or Slack card)
// always knows whether a number was MEASURED, DERIVED from measured inputs,
// ESTIMATED, or is simply UNKNOWN/unavailable. This is the no-fake-data guardrail
// applied to analytics, mirroring the evidence `kind` model applied to research.
// ─────────────────────────────────────────────────────────────────────────────
export const DATA_QUALITIES = ["MEASURED", "DERIVED", "ESTIMATED", "UNKNOWN"] as const;
export type DataQuality = (typeof DATA_QUALITIES)[number];

// Integration/connection state used by getSystemStatus and adapters.
export const CONNECTION_STATES = ["CONNECTED", "NOT_CONNECTED", "UNAVAILABLE"] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

// ─── Activity / event audit layer ────────────────────────────────────────────
// A generic, durable operational event stream. Consumed later by the company
// Alfred/James Slack command center. Facts and concise explanations only.
export const ACTIVITY_EVENT_TYPES = [
  "OPPORTUNITY_DISCOVERED",
  "RESEARCH_STARTED",
  "EVIDENCE_RECORDED",
  "OPPORTUNITY_SCORED",
  "OPPORTUNITY_TRANSITIONED",
  "SIGNAL_DETECTED",
  "RECOMMENDATION_CREATED",
  "RECOMMENDATION_APPROVED",
  "RECOMMENDATION_REJECTED",
  "EXPERIMENT_CREATED",
  "EXPERIMENT_STARTED",
  "EXPERIMENT_COMPLETED",
  "MARKET_VALIDATED",
  "MARKET_PAUSED",
  "SEO_PERFORMANCE_CHANGED",
  "DATA_INGESTION_COMPLETED",
  "DATA_INGESTION_FAILED",
  "APPROVAL_REQUIRED",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const ACTOR_TYPES = ["system", "worker", "human"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const EVENT_SEVERITIES = ["info", "notice", "warning", "critical"] as const;
export type EventSeverity = (typeof EVENT_SEVERITIES)[number];

export interface ActivityEvent {
  id: string;
  created_at: string;
  event_type: ActivityEventType;
  actor_type: ActorType;
  actor_name: string | null;
  system: string;
  target_type: string | null;
  target_id: string | null;
  market_id: string | null;
  niche_id: string | null;
  opportunity_id: string | null;
  recommendation_id: string | null;
  experiment_id: string | null;
  signal_id: string | null;
  title: string;
  summary: string | null;
  metadata: string | null; // JSON
  severity: EventSeverity;
  correlation_id: string | null;
}

// ─── Deterministic growth signals ────────────────────────────────────────────
export const SIGNAL_TYPES = [
  "HIGH_IMPRESSIONS_LOW_CTR",
  "COMMERCIAL_QUERY_POSITION_5_15",
  "TRAFFIC_WITH_LOW_LEAD_CONVERSION",
  "LOW_TRAFFIC_HIGH_LEAD_QUALITY",
  "PAGE_GAINING_VISIBILITY",
  "PAGE_LOSING_VISIBILITY",
  "HIGH_LEAD_VOLUME_POOR_OUTCOME",
  "HIGH_CONVERSION_LOW_TRAFFIC",
  "UNMAPPED_LEAD_ATTRIBUTION",
  "INSUFFICIENT_DATA",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_SCOPES = ["page", "market", "niche", "attribution", "system"] as const;
export type SignalScope = (typeof SIGNAL_SCOPES)[number];

export const SIGNAL_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

export interface Signal {
  id: string;
  created_at: string;
  signal_type: SignalType;
  scope: SignalScope;
  target: string;
  market_id: string | null;
  niche_id: string | null;
  severity: EventSeverity;
  confidence: number | null;
  data_quality: DataQuality;
  period_start: string | null;
  period_end: string | null;
  comparison_period_start: string | null;
  comparison_period_end: string | null;
  measured: string | null; // JSON
  threshold: string | null; // JSON
  evidence: string | null; // JSON
  status: SignalStatus;
  dedup_key: string | null;
}

// ─── Search Console dimensional store + ingestion cursor ─────────────────────
export interface SearchMetricRow {
  id: string;
  created_at: string;
  source: string;
  property: string;
  date: string;
  page: string | null;
  query: string | null;
  country: string | null;
  device: string | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  fetched_at: string;
}

export interface IngestionState {
  id: string;
  source: string;
  property: string;
  last_ingested_date: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  rows_ingested: number;
}
