// Opportunity service — the heart of the Opportunity Engine.
//
// An opportunity is a (market × niche) pair moving through a lifecycle. This
// module owns: discovery (creating the pair), scoring (deriving a fresh score
// from the evidence ledger and snapshotting it), and lifecycle transitions
// (an enforced state machine with approval gating + decision logging).

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import {
  STAGE_TRANSITIONS,
  APPROVAL_GATED_TRANSITIONS,
  type Opportunity,
  type OpportunityStage,
  type ScoreComponent,
} from "./types";
import { scoreOpportunity, type ScoreResult } from "./scoring";
import { resolveFactors } from "./evidence";
import { getMarket } from "./markets";
import { getNiche } from "./niches";
import { assertApproval, logDecision, type ApprovalContext } from "./permissions";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Create (or return the existing) opportunity for a market × niche pair. This is
 * "discovery": the pair exists as a candidate, stage DISCOVERED, unscored.
 */
export function discoverOpportunity(marketId: string, nicheId: string): Opportunity {
  if (!getMarket(marketId)) throw new Error(`Unknown market: ${marketId}`);
  if (!getNiche(nicheId)) throw new Error(`Unknown niche: ${nicheId}`);

  const existing = db
    .prepare("SELECT * FROM intel_opportunities WHERE market_id = ? AND niche_id = ?")
    .get(marketId, nicheId) as Opportunity | undefined;
  if (existing) return existing;

  const id = uuidv4();
  db.prepare(
    "INSERT INTO intel_opportunities (id, market_id, niche_id, stage) VALUES (?, ?, ?, 'DISCOVERED')",
  ).run(id, marketId, nicheId);
  return getOpportunity(id)!;
}

export function getOpportunity(id: string): Opportunity | undefined {
  return db.prepare("SELECT * FROM intel_opportunities WHERE id = ?").get(id) as
    | Opportunity
    | undefined;
}

export interface OpportunityWithContext extends Opportunity {
  market_city: string;
  market_state: string;
  niche_label: string;
}

/** List opportunities joined with market/niche labels, best score first. */
export function listOpportunities(): OpportunityWithContext[] {
  return db
    .prepare(
      `SELECT o.*, m.city AS market_city, m.state AS market_state, n.label AS niche_label
         FROM intel_opportunities o
         JOIN intel_markets m ON m.id = o.market_id
         JOIN intel_niches  n ON n.id = o.niche_id
        ORDER BY (o.score_overall IS NULL), o.score_overall DESC, o.updated_at DESC`,
    )
    .all() as OpportunityWithContext[];
}

/** Top N scored opportunities that are still open (not rejected). */
export function listTopOpportunities(limit = 10): OpportunityWithContext[] {
  return db
    .prepare(
      `SELECT o.*, m.city AS market_city, m.state AS market_state, n.label AS niche_label
         FROM intel_opportunities o
         JOIN intel_markets m ON m.id = o.market_id
         JOIN intel_niches  n ON n.id = o.niche_id
        WHERE o.score_overall IS NOT NULL AND o.stage != 'REJECTED'
        ORDER BY o.score_overall DESC
        LIMIT ?`,
    )
    .all(limit) as OpportunityWithContext[];
}

/**
 * Re-derive the score from the current evidence and snapshot it onto the
 * opportunity. Advances DISCOVERED/RESEARCHING → SCORED (never downgrades a
 * later-stage opportunity). Returns the full ScoreResult so callers can explain
 * exactly why it ranked where it did. `asOf` is passed through for deterministic
 * freshness handling in tests.
 */
export function scoreOpportunityById(id: string, asOf?: string): ScoreResult {
  const opp = getOpportunity(id);
  if (!opp) throw new Error(`Unknown opportunity: ${id}`);

  const factors = resolveFactors(id, asOf);
  const result = scoreOpportunity(factors);

  const advance = opp.stage === "DISCOVERED" || opp.stage === "RESEARCHING";
  db.prepare(
    `UPDATE intel_opportunities
        SET score_overall = ?,
            score_components = ?,
            score_reasons = ?,
            confidence = ?,
            confidence_label = ?,
            verdict = ?,
            scored_at = ?,
            stage = CASE WHEN ? THEN 'SCORED' ELSE stage END,
            updated_at = ?
      WHERE id = ?`,
  ).run(
    result.overall,
    JSON.stringify(result.components),
    JSON.stringify(result.reasons),
    result.confidence,
    result.confidenceLabel,
    result.verdict,
    asOf ?? nowIso(),
    advance ? 1 : 0,
    nowIso(),
    id,
  );

  return result;
}

export interface TransitionOptions {
  actor: string;
  approvedBy?: string | null;
  rationale?: string | null;
}

/**
 * Move an opportunity to a new stage through the enforced transition map.
 * APPROVED_FOR_TEST and SCALE are approval-gated (require approvedBy). Every
 * transition — allowed or attempted — is auditable via the returned decision.
 */
export function transitionOpportunity(
  id: string,
  to: OpportunityStage,
  opts: TransitionOptions,
): Opportunity {
  const opp = getOpportunity(id);
  if (!opp) throw new Error(`Unknown opportunity: ${id}`);

  const allowed = STAGE_TRANSITIONS[opp.stage] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal transition ${opp.stage} → ${to} (allowed: ${allowed.join(", ") || "none"})`);
  }

  const ctx: ApprovalContext = {
    actor: opts.actor,
    approvedBy: opts.approvedBy ?? null,
    rationale: opts.rationale ?? null,
  };
  // Gate the consequential transitions. assertApproval throws if unauthorized.
  let level: ReturnType<typeof assertApproval> = "READ";
  if (to === "APPROVED_FOR_TEST") level = assertApproval("approve_for_test", ctx);
  else if (to === "SCALE") level = assertApproval("scale_market", ctx);
  else if (APPROVAL_GATED_TRANSITIONS.includes(to)) level = assertApproval("approve_for_test", ctx);

  db.prepare("UPDATE intel_opportunities SET stage = ?, updated_at = ? WHERE id = ?").run(
    to,
    nowIso(),
    id,
  );

  logDecision({
    actor: opts.actor,
    subjectType: "opportunity",
    subjectId: id,
    action: "transition",
    fromState: opp.stage,
    toState: to,
    permissionLevel: level,
    rationale: opts.rationale ?? null,
  });

  return getOpportunity(id)!;
}

// Convenience: parse the JSON score snapshot back into typed shapes for the UI.
export function parseComponents(opp: Opportunity): Record<ScoreComponent, number | null> | null {
  if (!opp.score_components) return null;
  try {
    return JSON.parse(opp.score_components) as Record<ScoreComponent, number | null>;
  } catch {
    return null;
  }
}

export function parseReasons(opp: Opportunity): string[] {
  if (!opp.score_reasons) return [];
  try {
    const v = JSON.parse(opp.score_reasons);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}
