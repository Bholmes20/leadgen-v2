// Reusable CITY × NICHE research pipeline (P1C, Step 8/10).
//
// A research task tracks the WORK of researching one opportunity across the six
// scoring dimensions. Raw observations still live in intel_evidence (observation
// stays separate from conclusion); this module orchestrates the task lifecycle
// and evidence intake, applying the freshness policy. It is reusable for ANY
// market × niche — no Augusta or junk-removal assumptions. Later, James assigns
// these tasks to the Growth/Research Worker.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import { discoverOpportunity, getOpportunity, scoreOpportunityById } from "./opportunities";
import { getMarket } from "./markets";
import { getNiche } from "./niches";
import { recordEvidence, type EvidenceInput } from "./evidence";
import { defaultFreshUntil } from "./freshness";
import { safeRecordActivity } from "./activity";
import { SCORE_COMPONENTS } from "./types";
import type { ResearchTask, ResearchTaskStatus, ScoreComponent } from "./types";

const DIMENSIONS: readonly ScoreComponent[] = SCORE_COMPONENTS;

function nowIso(): string {
  return new Date().toISOString();
}

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export function getResearchTask(id: string): ResearchTask | undefined {
  return db.prepare("SELECT * FROM intel_research_tasks WHERE id = ?").get(id) as ResearchTask | undefined;
}

export function getResearchTaskByOpportunity(opportunityId: string): ResearchTask | undefined {
  return db.prepare("SELECT * FROM intel_research_tasks WHERE opportunity_id = ?").get(opportunityId) as
    | ResearchTask
    | undefined;
}

export function getResearchQueue(status?: ResearchTaskStatus): ResearchTask[] {
  const rows = (
    status
      ? db.prepare("SELECT * FROM intel_research_tasks WHERE status = ?").all(status)
      : db.prepare("SELECT * FROM intel_research_tasks").all()
  ) as ResearchTask[];
  // QUEUED/IN_PROGRESS first, then by recency.
  const rank: Record<ResearchTaskStatus, number> = { IN_PROGRESS: 0, QUEUED: 1, BLOCKED: 2, STALE: 3, COMPLETE: 4 };
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || b.created_at.localeCompare(a.created_at));
}

export interface CreateResearchTaskInput {
  marketId: string;
  nicheId: string;
  dimensions?: ScoreComponent[];
  assignedActor?: string | null;
}

/**
 * Create (or return the existing) research task for a market × niche. Discovers
 * the opportunity if needed. Idempotent per opportunity.
 */
export function createResearchTask(input: CreateResearchTaskInput): ResearchTask {
  if (!getMarket(input.marketId)) throw new Error(`Unknown market: ${input.marketId}`);
  if (!getNiche(input.nicheId)) throw new Error(`Unknown niche: ${input.nicheId}`);

  const opp = discoverOpportunity(input.marketId, input.nicheId);
  const existing = getResearchTaskByOpportunity(opp.id);
  if (existing) return existing;

  const id = uuidv4();
  const dims = input.dimensions ?? [...DIMENSIONS];
  db.prepare(
    `INSERT INTO intel_research_tasks
       (id, opportunity_id, market_id, niche_id, status, assigned_actor, dimensions, dimensions_completed)
     VALUES (?, ?, ?, ?, 'QUEUED', ?, ?, ?)`,
  ).run(id, opp.id, input.marketId, input.nicheId, input.assignedActor ?? null, JSON.stringify(dims), JSON.stringify([]));

  safeRecordActivity({
    event_type: "RESEARCH_TASK_CREATED",
    actor_type: input.assignedActor ? "worker" : "system",
    actor_name: input.assignedActor ?? "research-engine",
    target_type: "research_task",
    target_id: id,
    opportunity_id: opp.id,
    market_id: input.marketId,
    niche_id: input.nicheId,
    title: "Research task created",
    summary: `Queued research across ${dims.length} dimensions.`,
    metadata: { dimensions: dims },
    severity: "info",
  });

  return getResearchTask(id)!;
}

export function updateResearchTaskStatus(
  id: string,
  status: ResearchTaskStatus,
  actor = "system",
  blockers?: string | null,
): ResearchTask {
  const task = getResearchTask(id);
  if (!task) throw new Error(`Unknown research task: ${id}`);

  const startedAt = status === "IN_PROGRESS" && !task.started_at ? nowIso() : task.started_at;
  const completedAt = status === "COMPLETE" ? nowIso() : task.completed_at;
  db.prepare(
    "UPDATE intel_research_tasks SET status = ?, started_at = ?, completed_at = ?, blockers = COALESCE(?, blockers), updated_at = ? WHERE id = ?",
  ).run(status, startedAt, completedAt, blockers ?? null, nowIso(), id);

  if (status === "IN_PROGRESS" && !task.started_at) {
    safeRecordActivity({
      event_type: "RESEARCH_STARTED",
      actor_type: actor === "system" ? "system" : "worker",
      actor_name: actor,
      target_type: "research_task",
      target_id: id,
      opportunity_id: task.opportunity_id,
      market_id: task.market_id,
      niche_id: task.niche_id,
      title: "Research started",
      severity: "info",
    });
  }
  if (status === "COMPLETE") {
    safeRecordActivity({
      event_type: "RESEARCH_COMPLETED",
      actor_type: actor === "system" ? "system" : "worker",
      actor_name: actor,
      target_type: "research_task",
      target_id: id,
      opportunity_id: task.opportunity_id,
      market_id: task.market_id,
      niche_id: task.niche_id,
      title: "Research completed",
      severity: "notice",
    });
  }
  return getResearchTask(id)!;
}

export interface ResearchEvidenceInput extends Omit<EvidenceInput, "opportunity_id"> {
  opportunity_id: string; // required for research intake
  actor?: string | null;
}

/**
 * Record a research observation for an opportunity. Applies the freshness policy
 * (default fresh_until per factor when the caller doesn't supply one), moves the
 * task to IN_PROGRESS, bumps its evidence_count, and logs EVIDENCE_RECORDED.
 * Raw observation stays in intel_evidence — this never writes a conclusion.
 */
export function recordResearchEvidence(input: ResearchEvidenceInput) {
  if (!getOpportunity(input.opportunity_id)) throw new Error(`Unknown opportunity: ${input.opportunity_id}`);
  const observed = input.observed_at ?? nowIso();
  const fresh_until = input.fresh_until ?? defaultFreshUntil(input.factor_key, observed);

  const evidence = recordEvidence({ ...input, observed_at: observed, fresh_until });

  const task = getResearchTaskByOpportunity(input.opportunity_id);
  if (task) {
    const started = task.started_at ?? nowIso();
    const status = task.status === "QUEUED" ? "IN_PROGRESS" : task.status;
    db.prepare(
      "UPDATE intel_research_tasks SET evidence_count = evidence_count + 1, status = ?, started_at = ?, updated_at = ? WHERE id = ?",
    ).run(status, started, nowIso(), task.id);
  }

  safeRecordActivity({
    event_type: "EVIDENCE_RECORDED",
    actor_type: input.actor ? "worker" : "system",
    actor_name: input.actor ?? "research-engine",
    target_type: "opportunity",
    target_id: input.opportunity_id,
    opportunity_id: input.opportunity_id,
    market_id: input.market_id ?? null,
    niche_id: input.niche_id ?? null,
    title: `Evidence recorded: ${input.factor_key}`,
    summary: `${input.kind} observation${input.value_num != null ? ` = ${input.value_num}` : ""}.`,
    metadata: { factor_key: input.factor_key, kind: input.kind, source_url: input.source_url ?? null },
    severity: "info",
  });

  return evidence;
}

/**
 * Mark one research dimension complete. When every requested dimension is done,
 * the task moves to COMPLETE and the opportunity is re-scored (deterministically).
 */
export function completeResearchDimension(
  opportunityId: string,
  dimension: ScoreComponent,
  actor = "research-engine",
): ResearchTask {
  if (!DIMENSIONS.includes(dimension)) throw new Error(`Unknown research dimension: ${dimension}`);
  const task = getResearchTaskByOpportunity(opportunityId);
  if (!task) throw new Error(`No research task for opportunity: ${opportunityId}`);

  const requested = parseList(task.dimensions);
  const completed = new Set(parseList(task.dimensions_completed));
  completed.add(dimension);
  const startedAt = task.started_at ?? nowIso();
  db.prepare(
    "UPDATE intel_research_tasks SET dimensions_completed = ?, status = CASE WHEN status = 'QUEUED' THEN 'IN_PROGRESS' ELSE status END, started_at = ?, updated_at = ? WHERE id = ?",
  ).run(JSON.stringify([...completed]), startedAt, nowIso(), task.id);

  safeRecordActivity({
    event_type: "RESEARCH_DIMENSION_COMPLETED",
    actor_type: actor === "system" ? "system" : "worker",
    actor_name: actor,
    target_type: "research_task",
    target_id: task.id,
    opportunity_id: opportunityId,
    market_id: task.market_id,
    niche_id: task.niche_id,
    title: `Dimension complete: ${dimension}`,
    metadata: { completed: [...completed], requested },
    severity: "info",
  });

  const allDone = requested.length > 0 && requested.every((d) => completed.has(d));
  if (allDone) {
    // Re-score deterministically from stored evidence, then finalize the task.
    const result = scoreOpportunityById(opportunityId);
    db.prepare(
      "UPDATE intel_research_tasks SET status = 'COMPLETE', completed_at = ?, confidence = ?, updated_at = ? WHERE id = ?",
    ).run(nowIso(), result.confidence, nowIso(), task.id);
    safeRecordActivity({
      event_type: "RESEARCH_COMPLETED",
      actor_type: actor === "system" ? "system" : "worker",
      actor_name: actor,
      target_type: "research_task",
      target_id: task.id,
      opportunity_id: opportunityId,
      market_id: task.market_id,
      niche_id: task.niche_id,
      title: "Research completed",
      summary: `Re-scored: ${result.overall ?? "n/a"}/100 (${result.confidenceLabel} confidence).`,
      metadata: { score: result.overall, confidence: result.confidence },
      severity: "notice",
    });
    safeRecordActivity({
      event_type: "OPPORTUNITY_RESCORED",
      actor_type: "system",
      actor_name: "scoring-engine",
      target_type: "opportunity",
      target_id: opportunityId,
      opportunity_id: opportunityId,
      market_id: task.market_id,
      niche_id: task.niche_id,
      title: `Opportunity re-scored: ${result.overall ?? "n/a"}/100`,
      metadata: { score: result.overall, verdict: result.verdict },
      severity: "info",
    });
  }

  return getResearchTask(task.id)!;
}

/** Requested-but-not-completed dimensions for a task. */
export function missingDimensions(task: ResearchTask): string[] {
  const requested = parseList(task.dimensions);
  const completed = new Set(parseList(task.dimensions_completed));
  return requested.filter((d) => !completed.has(d));
}
