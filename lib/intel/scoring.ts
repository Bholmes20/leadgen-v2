// ─────────────────────────────────────────────────────────────────────────────
// Deterministic opportunity scoring — PURE, no DB, no AI, fully unit-testable.
//
// The scoring logic lives HERE in code (not in a prompt) so that every score is
// reproducible and explainable. Given the same factors you always get the same
// score, the same component breakdown, and the same human-readable reasons.
//
// How it works:
//   1. Each research factor has a spec: which component it feeds, its weight
//      within that component, its polarity ("up" = higher raw is better for us,
//      "down" = higher raw is worse), and a normalizer mapping raw → 0-100.
//   2. A component score is the weight-average of its PRESENT factors' directional
//      contributions. Missing factors are dropped (never invented) and surfaced.
//   3. The overall score is the weight-average of PRESENT components.
//   4. Confidence is separate from the score and is derived from (a) how much of
//      the factor set is covered and (b) the evidence-kind quality of what we do
//      have (FACT > ESTIMATE > INFERENCE > UNKNOWN). It is REPORTED alongside the
//      score, never blended into it — we must not imply precision we don't have.
// ─────────────────────────────────────────────────────────────────────────────

import {
  SCORE_COMPONENTS,
  EVIDENCE_KIND_TRUST,
  type ScoreComponent,
  type EvidenceKind,
  type ConfidenceLabel,
  type ScoreVerdict,
} from "./types";

// A resolved factor: the value plus the provenance kind of the datum behind it.
export interface FactorValue {
  value: number;
  kind: EvidenceKind;
}

// factor_key → resolved value (or absent). This is what the evidence layer
// produces (latest, non-stale evidence per factor).
export type FactorMap = Partial<Record<string, FactorValue>>;

type Polarity = "up" | "down";

interface FactorSpec {
  key: string;
  component: ScoreComponent;
  weight: number;
  polarity: Polarity;
  // Map a raw research value onto 0-100 in its NATURAL direction (monotonic
  // increasing in raw). Polarity is applied afterward, so a normalizer never
  // needs to know whether "more" is good or bad.
  normalize: (raw: number) => number;
  label: string;
}

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n));
// Most research factors are supplied already on a 0-100 scale by the researcher
// / worker (e.g. "SEO difficulty: 70"). identity just clamps them.
const identity = (raw: number): number => clamp(raw);
// Competitor count: 0 → 0 (nobody to beat), 10+ → 100 (crowded). Polarity "down"
// flips it so fewer competitors yields a higher competition-advantage score.
const countScale = (raw: number): number => clamp(raw * 10);
// Job ticket size in USD: $150 → 10, $600 → 40, $1500+ → 100.
const ticketScale = (usd: number): number => clamp(usd / 15);

// The factor registry. Component weights are the sum of their factors' weights,
// renormalized per component, so adding/removing a factor never silently rebalances
// the whole model.
export const FACTOR_SPECS: readonly FactorSpec[] = [
  // Demand — is anyone searching for / needing this?
  { key: "search_demand", component: "demand", weight: 1, polarity: "up", normalize: identity, label: "search demand" },
  { key: "keyword_breadth", component: "demand", weight: 0.5, polarity: "up", normalize: identity, label: "keyword breadth" },
  { key: "demand_trend", component: "demand", weight: 0.5, polarity: "up", normalize: identity, label: "demand trend" },

  // Competition ADVANTAGE — higher score = weaker competitors = easier for us.
  { key: "competitor_count", component: "competition", weight: 1, polarity: "down", normalize: countScale, label: "competitor count" },
  { key: "competitor_web_quality", component: "competition", weight: 1, polarity: "down", normalize: identity, label: "competitor website quality" },
  { key: "competitor_review_strength", component: "competition", weight: 1, polarity: "down", normalize: identity, label: "competitor review strength" },
  { key: "seo_difficulty", component: "competition", weight: 1, polarity: "down", normalize: identity, label: "SEO difficulty" },

  // Economics — is the money good?
  { key: "ticket_size_usd", component: "economics", weight: 1, polarity: "up", normalize: ticketScale, label: "job ticket size" },
  { key: "gross_margin_pct", component: "economics", weight: 1, polarity: "up", normalize: identity, label: "gross margin" },
  { key: "recurring_potential", component: "economics", weight: 0.5, polarity: "up", normalize: identity, label: "recurring / B2B potential" },

  // Fulfillment — can we actually deliver the job?
  { key: "contractor_availability", component: "fulfillment", weight: 1, polarity: "up", normalize: identity, label: "contractor availability" },
  { key: "fulfillment_radius_fit", component: "fulfillment", weight: 0.5, polarity: "up", normalize: identity, label: "fulfillment radius fit" },
  { key: "remote_quoting_suitability", component: "fulfillment", weight: 0.5, polarity: "up", normalize: identity, label: "remote-quoting suitability" },

  // Acquisition — can we get customers affordably?
  { key: "paid_difficulty", component: "acquisition", weight: 1, polarity: "down", normalize: identity, label: "paid-ad difficulty" },
  { key: "organic_opportunity", component: "acquisition", weight: 1, polarity: "up", normalize: identity, label: "organic opportunity" },

  // Strategic fit — does this move the business the right direction?
  { key: "strategic_fit", component: "strategic", weight: 1, polarity: "up", normalize: identity, label: "strategic fit" },
];

// Relative importance of each component in the overall score. Renormalized over
// the components that actually have at least one present factor.
export const COMPONENT_WEIGHTS: Record<ScoreComponent, number> = {
  demand: 0.2,
  competition: 0.2,
  economics: 0.2,
  fulfillment: 0.15,
  acquisition: 0.15,
  strategic: 0.1,
};

export interface ComponentResult {
  component: ScoreComponent;
  score: number | null; // null when no factor for this component was present
  factorsUsed: string[];
  missingFactors: string[];
}

export interface ScoreResult {
  overall: number | null;
  components: Record<ScoreComponent, number | null>;
  componentDetail: ComponentResult[];
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  verdict: ScoreVerdict;
  reasons: string[];
  coverage: number; // 0-1 fraction of the factor set that had a value
  presentFactorCount: number;
  totalFactorCount: number;
}

function directionalContribution(spec: FactorSpec, raw: number): number {
  const norm = spec.normalize(raw);
  return spec.polarity === "up" ? norm : 100 - norm;
}

function scoreComponent(component: ScoreComponent, factors: FactorMap): ComponentResult {
  const specs = FACTOR_SPECS.filter((s) => s.component === component);
  const used: string[] = [];
  const missing: string[] = [];
  let weighted = 0;
  let weightSum = 0;

  for (const spec of specs) {
    const fv = factors[spec.key];
    if (fv === undefined || !Number.isFinite(fv.value)) {
      missing.push(spec.key);
      continue;
    }
    used.push(spec.key);
    weighted += spec.weight * directionalContribution(spec, fv.value);
    weightSum += spec.weight;
  }

  return {
    component,
    score: weightSum > 0 ? Math.round(weighted / weightSum) : null,
    factorsUsed: used,
    missingFactors: missing,
  };
}

function computeConfidence(factors: FactorMap): {
  confidence: number;
  label: ConfidenceLabel;
  coverage: number;
  presentCount: number;
} {
  const total = FACTOR_SPECS.length;
  let present = 0;
  let trustSum = 0;

  for (const spec of FACTOR_SPECS) {
    const fv = factors[spec.key];
    if (fv === undefined || !Number.isFinite(fv.value)) continue;
    present += 1;
    trustSum += EVIDENCE_KIND_TRUST[fv.kind] ?? 0;
  }

  const coverage = present / total;
  const kindQuality = present > 0 ? trustSum / present : 0;
  // MULTIPLICATIVE, deliberately: confidence is bounded by BOTH how much of the
  // factor set we cover AND the provenance quality of what we have. Neither can
  // compensate for the other — full coverage of pure ESTIMATEs is still only
  // moderate confidence, and a couple of hard FACTs covering little is low. This
  // is the guard against implying precision we don't actually possess.
  const confidence = Math.round(100 * coverage * kindQuality);
  const label: ConfidenceLabel = confidence >= 70 ? "High" : confidence >= 40 ? "Medium" : "Low";
  return { confidence, label, coverage, presentCount: present };
}

// Turn the numbers into short, honest reasons a human/worker can read.
function buildReasons(detail: ComponentResult[], confLabel: ConfidenceLabel): string[] {
  const reasons: string[] = [];
  const scored = detail.filter((d) => d.score !== null) as (ComponentResult & { score: number })[];

  const strengths = scored.filter((d) => d.score >= 70).sort((a, b) => b.score - a.score);
  const weaknesses = scored.filter((d) => d.score <= 45).sort((a, b) => a.score - b.score);

  const phrase: Record<ScoreComponent, { strong: string; weak: string }> = {
    demand: { strong: "healthy search demand", weak: "thin search demand" },
    competition: { strong: "weak local competition to beat", weak: "strong entrenched competitors" },
    economics: { strong: "attractive job economics", weak: "weak job economics" },
    fulfillment: { strong: "contractor coverage is available", weak: "fulfillment coverage is uncertain" },
    acquisition: { strong: "favorable customer-acquisition path", weak: "difficult customer acquisition" },
    strategic: { strong: "strong strategic fit", weak: "limited strategic fit" },
  };

  for (const s of strengths) reasons.push(phrase[s.component].strong);
  for (const w of weaknesses) reasons.push(phrase[w.component].weak);

  const totalMissing = detail.reduce((n, d) => n + d.missingFactors.length, 0);
  if (totalMissing > 0) {
    reasons.push(
      `${totalMissing} factor${totalMissing === 1 ? "" : "s"} still lack evidence (confidence: ${confLabel})`,
    );
  }
  if (reasons.length === 0) reasons.push("scores are middling across the board");
  return reasons;
}

// The research verdict. Deliberately conservative: the strongest thing research
// alone can say is "worth validating with a real test". Low confidence caps the
// verdict at RESEARCH_MORE regardless of score.
function decideVerdict(overall: number | null, label: ConfidenceLabel): ScoreVerdict {
  if (overall === null) return "RESEARCH_MORE";
  if (label === "Low") return overall >= 50 ? "RESEARCH_MORE" : "DEPRIORITIZE";
  if (overall >= 70) return "VALIDATE";
  if (overall >= 50) return "RESEARCH_MORE";
  return "DEPRIORITIZE";
}

/** Score an opportunity from its resolved factor map. Pure and deterministic. */
export function scoreOpportunity(factors: FactorMap): ScoreResult {
  const componentDetail = SCORE_COMPONENTS.map((c) => scoreComponent(c, factors));

  const components = Object.fromEntries(
    componentDetail.map((d) => [d.component, d.score]),
  ) as Record<ScoreComponent, number | null>;

  // Overall: weight-average of present components, weights renormalized.
  let weighted = 0;
  let weightSum = 0;
  for (const d of componentDetail) {
    if (d.score === null) continue;
    const w = COMPONENT_WEIGHTS[d.component];
    weighted += w * d.score;
    weightSum += w;
  }
  const overall = weightSum > 0 ? Math.round(weighted / weightSum) : null;

  const { confidence, label, coverage, presentCount } = computeConfidence(factors);
  const verdict = decideVerdict(overall, label);
  const reasons = buildReasons(componentDetail, label);

  return {
    overall,
    components,
    componentDetail,
    confidence,
    confidenceLabel: label,
    verdict,
    reasons,
    coverage,
    presentFactorCount: presentCount,
    totalFactorCount: FACTOR_SPECS.length,
  };
}

// Exposed so the evidence layer and tests know exactly which factor keys the
// scorer understands (and can flag unknown keys / list gaps).
export const KNOWN_FACTOR_KEYS: readonly string[] = FACTOR_SPECS.map((s) => s.key);
