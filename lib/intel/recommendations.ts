// Recommendation queue — the future Marketing/Growth Worker's operating queue.
//
// Recommendations are PROPOSED by the system (research + growth rules), then move
// through an approval workflow. Creating/generating recommendations is a
// RECOMMEND-level capability (auto-allowed); APPROVING one is APPROVAL_REQUIRED.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import {
  type Recommendation,
  type RecommendationType,
  type RecommendationStatus,
  type Priority,
} from "./types";
import { assertApproval, logDecision } from "./permissions";
import { safeRecordActivity } from "./activity";

export interface RecommendationInput {
  type: RecommendationType;
  target: string;
  reason: string;
  evidence?: unknown; // serialized to JSON
  expected_impact?: string | null;
  confidence?: number | null;
  priority?: Priority;
  effort?: string | null;
  est_cost?: number | null; // cents
  // Stable identity so re-running a generator upserts instead of duplicating.
  dedup_key?: string | null;
}

/**
 * Create a recommendation, or refresh the existing one with the same dedup_key
 * (keeping its workflow status). Returns the row.
 */
export function createRecommendation(input: RecommendationInput): Recommendation {
  const dedup = input.dedup_key ?? `${input.type}:${input.target}`;
  const existing = db
    .prepare("SELECT * FROM intel_recommendations WHERE dedup_key = ?")
    .get(dedup) as Recommendation | undefined;

  const evidenceJson = input.evidence === undefined ? null : JSON.stringify(input.evidence);

  if (existing) {
    db.prepare(
      `UPDATE intel_recommendations
          SET reason = ?, evidence = ?, expected_impact = ?, confidence = ?,
              priority = ?, effort = ?, est_cost = ?
        WHERE id = ?`,
    ).run(
      input.reason,
      evidenceJson,
      input.expected_impact ?? null,
      input.confidence ?? null,
      input.priority ?? existing.priority,
      input.effort ?? null,
      input.est_cost ?? null,
      existing.id,
    );
    return getRecommendation(existing.id)!;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_recommendations
       (id, type, target, reason, evidence, expected_impact, confidence, priority, effort, est_cost, dedup_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.type,
    input.target,
    input.reason,
    evidenceJson,
    input.expected_impact ?? null,
    input.confidence ?? null,
    input.priority ?? "medium",
    input.effort ?? null,
    input.est_cost ?? null,
    dedup,
  );

  // Canonical creation point → single RECOMMENDATION_CREATED event (best-effort).
  safeRecordActivity({
    event_type: "RECOMMENDATION_CREATED",
    actor_type: "system",
    actor_name: "growth-engine",
    target_type: "recommendation",
    target_id: id,
    recommendation_id: id,
    title: `${input.type} → ${input.target}`,
    summary: input.reason,
    metadata: { priority: input.priority ?? "medium", dedup_key: dedup },
    severity: "info",
  });

  return getRecommendation(id)!;
}

export function getRecommendation(id: string): Recommendation | undefined {
  return db.prepare("SELECT * FROM intel_recommendations WHERE id = ?").get(id) as
    | Recommendation
    | undefined;
}

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function listRecommendations(status?: RecommendationStatus): Recommendation[] {
  const rows = (
    status
      ? db.prepare("SELECT * FROM intel_recommendations WHERE status = ?").all(status)
      : db.prepare("SELECT * FROM intel_recommendations").all()
  ) as Recommendation[];
  // Order by priority then recency in JS (SQLite can't rank the enum directly).
  return rows.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.created_at.localeCompare(a.created_at),
  );
}

/**
 * Approve a recommendation. APPROVAL_REQUIRED: `approvedBy` must be provided or
 * this throws (fail-closed). Logs the decision.
 */
export function approveRecommendation(id: string, approvedBy: string, rationale?: string): Recommendation {
  const rec = getRecommendation(id);
  if (!rec) throw new Error(`Unknown recommendation: ${id}`);

  const level = assertApproval("approve_recommendation", { actor: approvedBy, approvedBy, rationale });

  db.prepare(
    "UPDATE intel_recommendations SET status = 'APPROVED', reviewed_at = ?, approved_by = ? WHERE id = ?",
  ).run(new Date().toISOString(), approvedBy, id);

  logDecision({
    actor: approvedBy,
    subjectType: "recommendation",
    subjectId: id,
    action: "approve",
    fromState: rec.status,
    toState: "APPROVED",
    permissionLevel: level,
    rationale: rationale ?? null,
  });

  safeRecordActivity({
    event_type: "RECOMMENDATION_APPROVED",
    actor_type: "human",
    actor_name: approvedBy,
    target_type: "recommendation",
    target_id: id,
    recommendation_id: id,
    title: `Approved: ${rec.type} → ${rec.target}`,
    summary: rationale ?? null,
    metadata: { fromStatus: rec.status },
    severity: "notice",
  });

  return getRecommendation(id)!;
}

export function updateRecommendationStatus(
  id: string,
  status: RecommendationStatus,
  actor = "system",
): Recommendation {
  const rec = getRecommendation(id);
  if (!rec) throw new Error(`Unknown recommendation: ${id}`);
  db.prepare("UPDATE intel_recommendations SET status = ? WHERE id = ?").run(status, id);
  logDecision({
    actor,
    subjectType: "recommendation",
    subjectId: id,
    action: "status_change",
    fromState: rec.status,
    toState: status,
    permissionLevel: "READ",
  });
  if (status === "REJECTED") {
    safeRecordActivity({
      event_type: "RECOMMENDATION_REJECTED",
      actor_type: actor === "system" ? "system" : "human",
      actor_name: actor,
      target_type: "recommendation",
      target_id: id,
      recommendation_id: id,
      title: `Rejected: ${rec.type} → ${rec.target}`,
      metadata: { fromStatus: rec.status },
      severity: "notice",
    });
  }
  return getRecommendation(id)!;
}

export function recordRecommendationOutcome(id: string, outcome: string): Recommendation {
  const rec = getRecommendation(id);
  if (!rec) throw new Error(`Unknown recommendation: ${id}`);
  db.prepare("UPDATE intel_recommendations SET outcome = ?, status = 'COMPLETED' WHERE id = ?").run(
    outcome,
    id,
  );
  return getRecommendation(id)!;
}
