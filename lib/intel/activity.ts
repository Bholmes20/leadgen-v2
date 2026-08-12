// Activity / event audit layer (P1B, Step 7 & 8).
//
// A generic, durable operational event stream — the substrate the company-level
// Alfred/James Slack command center will render later (see
// docs/intel/slack-event-contract.md). This is NOT a Lead-Gen Slack bot; it only
// persists structured operational facts.
//
// Discipline: events carry FACTS and concise, human-readable explanations. They
// MUST NOT contain private chain-of-thought or hidden model reasoning.
//
// Workers and the admin UI both read through these same functions — no screen
// scraping. Recording is best-effort at call sites via safeRecordActivity(): an
// audit-log failure must never break a core lifecycle operation.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import type { ActivityEvent, ActivityEventType, ActorType, EventSeverity } from "./types";

export interface ActivityInput {
  event_type: ActivityEventType;
  title: string;
  summary?: string | null;
  actor_type?: ActorType;
  actor_name?: string | null;
  system?: string;
  target_type?: string | null;
  target_id?: string | null;
  market_id?: string | null;
  niche_id?: string | null;
  opportunity_id?: string | null;
  recommendation_id?: string | null;
  experiment_id?: string | null;
  signal_id?: string | null;
  metadata?: unknown; // serialized to JSON
  severity?: EventSeverity;
  correlation_id?: string | null;
}

/** Append one operational event. Returns the stored row. */
export function recordActivity(input: ActivityInput): ActivityEvent {
  const id = uuidv4();
  const metadata = input.metadata === undefined ? null : JSON.stringify(input.metadata);
  db.prepare(
    `INSERT INTO intel_activity_events
       (id, event_type, actor_type, actor_name, system, target_type, target_id,
        market_id, niche_id, opportunity_id, recommendation_id, experiment_id,
        signal_id, title, summary, metadata, severity, correlation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.event_type,
    input.actor_type ?? "system",
    input.actor_name ?? null,
    input.system ?? "growth-intelligence",
    input.target_type ?? null,
    input.target_id ?? null,
    input.market_id ?? null,
    input.niche_id ?? null,
    input.opportunity_id ?? null,
    input.recommendation_id ?? null,
    input.experiment_id ?? null,
    input.signal_id ?? null,
    input.title,
    input.summary ?? null,
    metadata,
    input.severity ?? "info",
    input.correlation_id ?? null,
  );
  return getActivityEvent(id)!;
}

/**
 * Best-effort recording for use inside core lifecycle functions. Swallows any
 * error (returning null) so the audit log can never break the operation it is
 * describing.
 */
export function safeRecordActivity(input: ActivityInput): ActivityEvent | null {
  try {
    return recordActivity(input);
  } catch {
    return null;
  }
}

export function getActivityEvent(id: string): ActivityEvent | undefined {
  return db.prepare("SELECT * FROM intel_activity_events WHERE id = ?").get(id) as
    | ActivityEvent
    | undefined;
}

export function listRecentActivity(limit = 50): ActivityEvent[] {
  return db
    .prepare("SELECT * FROM intel_activity_events ORDER BY created_at DESC, rowid DESC LIMIT ?")
    .all(limit) as ActivityEvent[];
}

export function listActivityForMarket(marketId: string, limit = 50): ActivityEvent[] {
  return db
    .prepare(
      "SELECT * FROM intel_activity_events WHERE market_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
    )
    .all(marketId, limit) as ActivityEvent[];
}

export function listActivityForOpportunity(opportunityId: string, limit = 50): ActivityEvent[] {
  return db
    .prepare(
      "SELECT * FROM intel_activity_events WHERE opportunity_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
    )
    .all(opportunityId, limit) as ActivityEvent[];
}

export function listActivityForRecommendation(recommendationId: string, limit = 50): ActivityEvent[] {
  return db
    .prepare(
      "SELECT * FROM intel_activity_events WHERE recommendation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
    )
    .all(recommendationId, limit) as ActivityEvent[];
}

export function listActivityForExperiment(experimentId: string, limit = 50): ActivityEvent[] {
  return db
    .prepare(
      "SELECT * FROM intel_activity_events WHERE experiment_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
    )
    .all(experimentId, limit) as ActivityEvent[];
}
