// Approval boundaries — the guardrail that keeps a future autonomous worker from
// taking consequential actions without human/James sign-off.
//
// Mirrors the fail-closed philosophy of lib/sms.ts: capabilities default to their
// declared level, and anything at APPROVAL_REQUIRED throws unless the caller
// presents an explicit approval. Every consequential action is logged to
// intel_decisions so the weekly report and audit trail are complete.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import {
  CAPABILITY_LEVELS,
  type Capability,
  type PermissionLevel,
  type Decision,
} from "./types";

export function requiredLevel(capability: Capability): PermissionLevel {
  return CAPABILITY_LEVELS[capability];
}

export interface ApprovalContext {
  actor: string; // who is acting (e.g. 'james', 'growth-worker', 'owner')
  approvedBy?: string | null; // set only for a human/authorized approval
  rationale?: string | null;
}

export class ApprovalRequiredError extends Error {
  constructor(
    public capability: Capability,
    public level: PermissionLevel,
  ) {
    super(
      `Capability "${capability}" requires ${level}. No approval was provided — action blocked (fail-closed).`,
    );
    this.name = "ApprovalRequiredError";
  }
}

/**
 * Assert that `ctx` is allowed to perform `capability`. READ/RECOMMEND pass
 * automatically. APPROVAL_REQUIRED / EXECUTE demand an explicit `approvedBy`.
 * Throws ApprovalRequiredError when blocked. Returns the required level.
 */
export function assertApproval(capability: Capability, ctx: ApprovalContext): PermissionLevel {
  const level = requiredLevel(capability);
  if (level === "APPROVAL_REQUIRED" || level === "EXECUTE") {
    if (!ctx.approvedBy) throw new ApprovalRequiredError(capability, level);
  }
  return level;
}

export interface DecisionInput {
  actor: string;
  subjectType: string;
  subjectId: string;
  action: string;
  fromState?: string | null;
  toState?: string | null;
  permissionLevel: PermissionLevel;
  rationale?: string | null;
}

/** Append an immutable record of a decision/action to the audit log. */
export function logDecision(input: DecisionInput): Decision {
  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_decisions
       (id, actor, subject_type, subject_id, action, from_state, to_state, permission_level, rationale)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.actor,
    input.subjectType,
    input.subjectId,
    input.action,
    input.fromState ?? null,
    input.toState ?? null,
    input.permissionLevel,
    input.rationale ?? null,
  );
  return db.prepare("SELECT * FROM intel_decisions WHERE id = ?").get(id) as Decision;
}

export function listDecisions(subjectId?: string): Decision[] {
  if (subjectId) {
    return db
      .prepare("SELECT * FROM intel_decisions WHERE subject_id = ? ORDER BY created_at DESC")
      .all(subjectId) as Decision[];
  }
  return db.prepare("SELECT * FROM intel_decisions ORDER BY created_at DESC LIMIT 200").all() as Decision[];
}
