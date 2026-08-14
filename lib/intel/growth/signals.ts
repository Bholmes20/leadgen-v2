// Deterministic growth-signal engine (P1B, Step 5 & 6).
//
// A signal is a threshold-crossing OBSERVATION — never an action, never
// autonomous execution. All thresholds live in GROWTH_SIGNAL_THRESHOLDS (plain
// config, NOT hidden in any prompt). Every persisted signal records the measured
// values and the exact threshold that produced it, so it is fully explainable.
//
// If the data a signal needs isn't available (GSC/GA4 not connected), the signal
// is SUPPRESSED and listed in `skipped` — it is never fabricated. Signals that
// depend only on the real leads we already have (attribution gaps, thin volume)
// fire today.

import db from "../../db";
import { v4 as uuidv4 } from "uuid";
import { getLeadPerformance } from "./performance";
import { buildPagePerformance, type PagePerformanceRow } from "./pageModel";
import { searchConsoleAdapter, ga4Adapter } from "./adapters";
import { createRecommendation } from "../recommendations";
import { safeRecordActivity } from "../activity";
import { GSC_DEPENDENT_SIGNALS } from "../types";
import type {
  ActivityEventType,
  EventSeverity,
  DataQuality,
  Recommendation,
  RecommendationType,
  Signal,
  SignalScope,
  SignalStatus,
  SignalType,
} from "../types";

// ── Transparent thresholds ───────────────────────────────────────────────────
export const GROWTH_SIGNAL_THRESHOLDS = {
  minLeadsForAnalysis: 20, // below this, emit INSUFFICIENT_DATA instead of guessing
  unmappedLeadRatio: 0.2, // >20% of leads unattributed → attribution signal
  unmappedLeadFloor: 3, // …and at least this many, so tiny samples don't fire
  highImpressions: 500, // per period, to call CTR "low" meaningfully
  lowCtr: 0.02, // 2%
  commercialPositionLow: 5, // positions 5..15 = page 1-2, improvable
  commercialPositionHigh: 15,
  lowConversionRate: 0.02, // sessions → leads (needs GA4)
  goodLeadFloor: 5, // "good lead volume" for a page/market
  lowSessions: 100, // needs GA4
  poorOutcomeLostRatio: 0.5, // ≥50% of a page's leads lost/stale
  visibilityChangePct: 0.25, // ±25% impressions vs comparison (needs history)
} as const;

export interface SignalInput {
  signal_type: SignalType;
  scope: SignalScope;
  target: string;
  market_id?: string | null;
  niche_id?: string | null;
  severity?: EventSeverity;
  confidence?: number | null;
  data_quality?: DataQuality;
  period_start?: string | null;
  period_end?: string | null;
  comparison_period_start?: string | null;
  comparison_period_end?: string | null;
  measured?: unknown;
  threshold?: unknown;
  evidence?: unknown;
  dedup_key?: string | null;
  event_type?: ActivityEventType; // activity event on first creation (default SIGNAL_DETECTED)
}

export function getSignal(id: string): Signal | undefined {
  return db.prepare("SELECT * FROM intel_signals WHERE id = ?").get(id) as Signal | undefined;
}

export function listSignals(status?: SignalStatus): Signal[] {
  const rows = (
    status
      ? db.prepare("SELECT * FROM intel_signals WHERE status = ?").all(status)
      : db.prepare("SELECT * FROM intel_signals").all()
  ) as Signal[];
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Persist a signal, or refresh the existing one with the same dedup_key (keeping
 * its acknowledgement status). Emits a SIGNAL_DETECTED activity event only on
 * first creation, to avoid re-eval spam. Returns { signal, created }.
 */
export function recordSignal(input: SignalInput): { signal: Signal; created: boolean } {
  const dedup = input.dedup_key ?? `${input.signal_type}:${input.target}`;
  const existing = db.prepare("SELECT * FROM intel_signals WHERE dedup_key = ?").get(dedup) as
    | Signal
    | undefined;

  const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));

  if (existing) {
    db.prepare(
      `UPDATE intel_signals
          SET severity = ?, confidence = ?, data_quality = ?, period_start = ?, period_end = ?,
              comparison_period_start = ?, comparison_period_end = ?, measured = ?, threshold = ?, evidence = ?
        WHERE id = ?`,
    ).run(
      input.severity ?? existing.severity,
      input.confidence ?? null,
      input.data_quality ?? "MEASURED",
      input.period_start ?? null,
      input.period_end ?? null,
      input.comparison_period_start ?? null,
      input.comparison_period_end ?? null,
      json(input.measured),
      json(input.threshold),
      json(input.evidence),
      existing.id,
    );
    return { signal: getSignal(existing.id)!, created: false };
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_signals
       (id, signal_type, scope, target, market_id, niche_id, severity, confidence, data_quality,
        period_start, period_end, comparison_period_start, comparison_period_end,
        measured, threshold, evidence, dedup_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.signal_type,
    input.scope,
    input.target,
    input.market_id ?? null,
    input.niche_id ?? null,
    input.severity ?? "info",
    input.confidence ?? null,
    input.data_quality ?? "MEASURED",
    input.period_start ?? null,
    input.period_end ?? null,
    input.comparison_period_start ?? null,
    input.comparison_period_end ?? null,
    json(input.measured),
    json(input.threshold),
    json(input.evidence),
    dedup,
  );

  safeRecordActivity({
    event_type: input.event_type ?? "SIGNAL_DETECTED",
    actor_type: "system",
    actor_name: "growth-engine",
    target_type: "signal",
    target_id: input.target,
    market_id: input.market_id ?? null,
    niche_id: input.niche_id ?? null,
    signal_id: id,
    title: `${input.signal_type} — ${input.target}`,
    summary: signalSummary(input),
    metadata: { measured: input.measured ?? null, threshold: input.threshold ?? null },
    severity: input.severity ?? "info",
  });

  return { signal: getSignal(id)!, created: true };
}

function signalSummary(input: SignalInput): string {
  switch (input.signal_type) {
    case "INSUFFICIENT_DATA":
      return "Not enough leads in range to analyze reliably.";
    case "UNMAPPED_LEAD_ATTRIBUTION":
      return "A meaningful share of leads have no usable page/market attribution.";
    case "HIGH_IMPRESSIONS_LOW_CTR":
      return "Strong search visibility but weak click-through — likely a title/meta opportunity.";
    case "COMMERCIAL_QUERY_POSITION_5_15":
      return "Ranking just off page one — within striking distance.";
    case "HIGH_LEAD_VOLUME_POOR_OUTCOME":
      return "Page produces leads but they aren't converting to won outcomes.";
    default:
      return "";
  }
}

export interface SignalEvaluation {
  created: Signal[]; // signals created this run
  refreshed: Signal[]; // signals updated (already existed)
  skipped: { signal_type: SignalType; reason: string }[]; // suppressed (missing data)
  thresholds: typeof GROWTH_SIGNAL_THRESHOLDS;
  evaluatedPages: number;
}

/**
 * Evaluate all deterministic signals over current real data. Signals needing an
 * unavailable integration are reported in `skipped`, never fabricated.
 * `now` is injectable for deterministic tests.
 */
export function evaluateGrowthSignals(opts: { now?: string } = {}): SignalEvaluation {
  const periodEnd = (opts.now ?? new Date().toISOString()).slice(0, 10);
  const T = GROWTH_SIGNAL_THRESHOLDS;
  const created: Signal[] = [];
  const refreshed: Signal[] = [];
  const skipped: SignalEvaluation["skipped"] = [];

  const gsc = searchConsoleAdapter.isAvailable();
  const ga4 = ga4Adapter.isAvailable();

  const overall = getLeadPerformance();
  const pages = buildPagePerformance();

  const emit = (input: SignalInput) => {
    const { signal, created: isNew } = recordSignal(input);
    (isNew ? created : refreshed).push(signal);
  };

  // ── Leads-only signals (available today) ───────────────────────────────────

  // INSUFFICIENT_DATA — honest "not enough to analyze".
  if (overall.totalLeads < T.minLeadsForAnalysis) {
    emit({
      signal_type: "INSUFFICIENT_DATA",
      scope: "system",
      target: "lead-analysis",
      severity: "notice",
      confidence: 100,
      data_quality: "MEASURED",
      period_end: periodEnd,
      measured: { totalLeads: overall.totalLeads },
      threshold: { minLeadsForAnalysis: T.minLeadsForAnalysis },
      evidence: { note: "Growth signals that need volume are held until more leads accrue." },
    });
  }

  // UNMAPPED_LEAD_ATTRIBUTION — real leads with no usable attribution.
  const gap = overall.unattributedLeads + overall.unmappedCityLeads + overall.unmappedNicheLeads;
  const ratio = overall.totalLeads > 0 ? overall.unattributedLeads / overall.totalLeads : 0;
  if (
    overall.totalLeads > 0 &&
    overall.unattributedLeads >= T.unmappedLeadFloor &&
    ratio >= T.unmappedLeadRatio
  ) {
    emit({
      signal_type: "UNMAPPED_LEAD_ATTRIBUTION",
      scope: "attribution",
      target: "leads",
      severity: "warning",
      confidence: 90,
      data_quality: "MEASURED",
      period_end: periodEnd,
      measured: {
        totalLeads: overall.totalLeads,
        unattributedLeads: overall.unattributedLeads,
        unmappedCityLeads: overall.unmappedCityLeads,
        unmappedNicheLeads: overall.unmappedNicheLeads,
        unattributedRatio: ratio,
      },
      threshold: { unmappedLeadRatio: T.unmappedLeadRatio, unmappedLeadFloor: T.unmappedLeadFloor },
      evidence: { totalAttributionGap: gap },
    });
  }

  // HIGH_LEAD_VOLUME_POOR_OUTCOME — per page, DERIVED from status buckets.
  for (const p of pages) {
    if (p.leads < T.goodLeadFloor) continue;
    const lost = p.byBucket.lost ?? 0;
    const won = p.byBucket.won ?? 0;
    if (won === 0 && p.leads > 0 && lost / p.leads >= T.poorOutcomeLostRatio) {
      emit({
        signal_type: "HIGH_LEAD_VOLUME_POOR_OUTCOME",
        scope: "page",
        target: p.slug,
        market_id: p.marketId,
        niche_id: p.nicheId,
        severity: "warning",
        confidence: 65,
        data_quality: "DERIVED",
        period_end: periodEnd,
        measured: { leads: p.leads, won, lost, lostRatio: lost / p.leads },
        threshold: { goodLeadFloor: T.goodLeadFloor, poorOutcomeLostRatio: T.poorOutcomeLostRatio },
      });
    }
  }

  // ── GSC-dependent signals ──────────────────────────────────────────────────
  if (!gsc) {
    skipped.push({ signal_type: "HIGH_IMPRESSIONS_LOW_CTR", reason: "Search Console not connected" });
    skipped.push({ signal_type: "COMMERCIAL_QUERY_POSITION_5_15", reason: "Search Console not connected" });
    skipped.push({ signal_type: "PAGE_GAINING_VISIBILITY", reason: "Search Console not connected (needs comparison window)" });
    skipped.push({ signal_type: "PAGE_LOSING_VISIBILITY", reason: "Search Console not connected (needs comparison window)" });
  } else {
    for (const p of pages) evaluateSearchSignals(p, periodEnd, emit);
  }

  // ── GA4-dependent signals ──────────────────────────────────────────────────
  if (!ga4) {
    skipped.push({ signal_type: "TRAFFIC_WITH_LOW_LEAD_CONVERSION", reason: "GA4 not connected (needs sessions)" });
    skipped.push({ signal_type: "HIGH_CONVERSION_LOW_TRAFFIC", reason: "GA4 not connected (needs sessions)" });
    skipped.push({ signal_type: "LOW_TRAFFIC_HIGH_LEAD_QUALITY", reason: "GA4 not connected (needs sessions)" });
  }

  return { created, refreshed, skipped, thresholds: T, evaluatedPages: pages.length };
}

// GSC-fed per-page signals (only reachable when GSC is connected & has data).
function evaluateSearchSignals(
  p: PagePerformanceRow,
  periodEnd: string,
  emit: (input: SignalInput) => void,
): void {
  const T = GROWTH_SIGNAL_THRESHOLDS;
  const s = p.search;
  if (s.status !== "CONNECTED" || s.quality !== "MEASURED") return;

  if (s.impressions != null && s.ctr != null && s.impressions >= T.highImpressions && s.ctr < T.lowCtr) {
    emit({
      signal_type: "HIGH_IMPRESSIONS_LOW_CTR",
      scope: "page",
      target: p.slug,
      market_id: p.marketId,
      niche_id: p.nicheId,
      severity: "notice",
      confidence: 70,
      data_quality: "MEASURED",
      period_end: periodEnd,
      measured: { impressions: s.impressions, ctr: s.ctr },
      threshold: { highImpressions: T.highImpressions, lowCtr: T.lowCtr },
    });
  }

  if (s.position != null && s.position >= T.commercialPositionLow && s.position <= T.commercialPositionHigh) {
    emit({
      signal_type: "COMMERCIAL_QUERY_POSITION_5_15",
      scope: "page",
      target: p.slug,
      market_id: p.marketId,
      niche_id: p.nicheId,
      severity: "notice",
      confidence: 65,
      data_quality: "MEASURED",
      period_end: periodEnd,
      measured: { position: s.position },
      threshold: { low: T.commercialPositionLow, high: T.commercialPositionHigh },
    });
  }
}

// ── Signal → PROPOSED recommendation mapping (Step 6) ────────────────────────
interface RecMapping {
  type: RecommendationType;
  priority: Recommendation["priority"];
  effort: string;
  expected_impact: string;
}

const SIGNAL_TO_RECOMMENDATION: Partial<Record<SignalType, RecMapping>> = {
  // Leads-side (P1B)
  HIGH_CONVERSION_LOW_TRAFFIC: { type: "EXPAND_ACQUISITION", priority: "medium", effort: "medium", expected_impact: "Scale a proven converter" },
  LOW_TRAFFIC_HIGH_LEAD_QUALITY: { type: "EXPAND_ACQUISITION", priority: "medium", effort: "medium", expected_impact: "Drive more traffic to a high-quality page" },
  TRAFFIC_WITH_LOW_LEAD_CONVERSION: { type: "IMPROVE_CRO", priority: "high", effort: "medium", expected_impact: "More leads from existing traffic" },
  HIGH_LEAD_VOLUME_POOR_OUTCOME: { type: "IMPROVE_CONVERSION", priority: "high", effort: "medium", expected_impact: "Turn leads into won jobs" },
  UNMAPPED_LEAD_ATTRIBUTION: { type: "FIX_ATTRIBUTION", priority: "high", effort: "low", expected_impact: "Attribute leads so performance is measurable" },
  // SEO / Search Console (P1C)
  HIGH_IMPRESSIONS_LOW_CTR: { type: "OPTIMIZE_PAGE_METADATA", priority: "high", effort: "low", expected_impact: "More clicks from existing impressions" },
  COMMERCIAL_QUERY_POSITION_5_15: { type: "IMPROVE_EXISTING_PAGE", priority: "medium", effort: "medium", expected_impact: "Move to page-one positions" },
  QUERY_POSITION_NEAR_PAGE_ONE: { type: "IMPROVE_EXISTING_PAGE", priority: "medium", effort: "medium", expected_impact: "Push a near-page-one query onto page one" },
  QUERY_POSITION_NEAR_TOP_THREE: { type: "MONITOR_WINNER", priority: "low", effort: "low", expected_impact: "Protect a near-top-three position" },
  QUERY_GAINING_VISIBILITY: { type: "CREATE_SUPPORTING_CONTENT", priority: "medium", effort: "medium", expected_impact: "Reinforce a query gaining traction" },
  CTR_DECLINING: { type: "OPTIMIZE_PAGE_METADATA", priority: "medium", effort: "low", expected_impact: "Recover declining click-through" },
  POSITION_IMPROVING: { type: "MONITOR_WINNER", priority: "low", effort: "low", expected_impact: "Watch an improving page" },
  POSITION_DECLINING: { type: "IMPROVE_EXISTING_PAGE", priority: "high", effort: "medium", expected_impact: "Arrest a declining ranking" },
  PAGE_LOSING_VISIBILITY: { type: "INVESTIGATE_PAGE", priority: "high", effort: "medium", expected_impact: "Recover lost search visibility" },
  PAGE_GAINING_VISIBILITY: { type: "MONITOR_WINNER", priority: "low", effort: "low", expected_impact: "Capitalize on rising visibility" },
  PAGE_WITH_IMPRESSIONS_NO_CLICKS: { type: "OPTIMIZE_PAGE_METADATA", priority: "medium", effort: "low", expected_impact: "Earn first clicks from a seen-but-unclicked page" },
  PAGE_WITH_CLICKS_NO_LEADS: { type: "IMPROVE_CRO", priority: "high", effort: "medium", expected_impact: "Convert existing clicks into leads" },
  PAGE_WITH_LEADS_AND_GROWING_VISIBILITY: { type: "EXPAND_ACQUISITION", priority: "medium", effort: "medium", expected_impact: "Double down on a proven, rising page" },
};

export interface RecommendationGeneration {
  created: Recommendation[];
  fromSignals: number;
  skippedTypes: SignalType[]; // OPEN signal types with no recommendation mapping
}

/**
 * Turn OPEN signals into PROPOSED recommendations (RECOMMEND level — proposing
 * needs no approval; executing still does). Deduplicated via createRecommendation's
 * dedup_key so re-running never spams. INSUFFICIENT_DATA produces no action.
 */
export function generateRecommendationsFromSignals(): RecommendationGeneration {
  const open = listSignals("OPEN");
  const created: Recommendation[] = [];
  const skippedTypes = new Set<SignalType>();
  let fromSignals = 0;

  for (const sig of open) {
    const mapping = SIGNAL_TO_RECOMMENDATION[sig.signal_type];
    if (!mapping) {
      skippedTypes.add(sig.signal_type);
      continue;
    }
    fromSignals++;
    const dedup = `${mapping.type}:${sig.target}`;
    // createRecommendation is the canonical creation point and emits a single
    // activity event (deduplicated by dedup_key). SEO-origin signals log the
    // SEO_RECOMMENDATION_CREATED event type; others log RECOMMENDATION_CREATED.
    const isSeo = GSC_DEPENDENT_SIGNALS.includes(sig.signal_type);
    const rec = createRecommendation({
      type: mapping.type,
      target: sig.target,
      reason: `${sig.signal_type} on ${sig.target}: ${signalSummary({ signal_type: sig.signal_type, scope: sig.scope, target: sig.target })}`.trim(),
      evidence: { signalId: sig.id, measured: parseJson(sig.measured), threshold: parseJson(sig.threshold) },
      expected_impact: mapping.expected_impact,
      confidence: sig.confidence,
      priority: mapping.priority,
      effort: mapping.effort,
      dedup_key: dedup,
      activity_event_type: isSeo ? "SEO_RECOMMENDATION_CREATED" : "RECOMMENDATION_CREATED",
    });
    created.push(rec);
  }

  return { created, fromSignals, skippedTypes: [...skippedTypes] };
}

function parseJson(s: string | null): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
