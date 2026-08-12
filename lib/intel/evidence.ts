// Evidence ledger — append-only research observations with provenance.
//
// This is the ground truth behind every score. Nothing here is invented: each
// row records WHAT was observed, its `kind` (FACT/ESTIMATE/INFERENCE/UNKNOWN),
// WHERE it came from (source_url/author), and WHEN (observed_at + optional
// fresh_until). Scoring reads the latest non-stale value per factor.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import { EVIDENCE_KINDS, type Evidence, type EvidenceKind } from "./types";
import { KNOWN_FACTOR_KEYS } from "./scoring";
import type { FactorMap } from "./scoring";

export interface EvidenceInput {
  opportunity_id?: string | null;
  market_id?: string | null;
  niche_id?: string | null;
  factor_key: string;
  value_num?: number | null;
  value_text?: string | null;
  kind: EvidenceKind;
  confidence?: number | null;
  unit?: string | null;
  source_url?: string | null;
  observed_at?: string | null; // defaults to now
  fresh_until?: string | null;
  author?: string | null;
  notes?: string | null;
}

/**
 * Record one research observation. Append-only (never updates a prior row) so
 * the full history — and thus how a score changed over time — is preserved.
 * An unrecognized `kind` is coerced to UNKNOWN rather than trusted.
 */
export function recordEvidence(input: EvidenceInput): Evidence {
  const id = uuidv4();
  const kind: EvidenceKind = EVIDENCE_KINDS.includes(input.kind) ? input.kind : "UNKNOWN";
  const observed = input.observed_at ?? new Date().toISOString();

  db.prepare(
    `INSERT INTO intel_evidence
       (id, opportunity_id, market_id, niche_id, factor_key, value_num, value_text,
        kind, confidence, unit, source_url, observed_at, fresh_until, author, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.opportunity_id ?? null,
    input.market_id ?? null,
    input.niche_id ?? null,
    input.factor_key,
    input.value_num ?? null,
    input.value_text ?? null,
    kind,
    input.confidence ?? null,
    input.unit ?? null,
    input.source_url ?? null,
    observed,
    input.fresh_until ?? null,
    input.author ?? null,
    input.notes ?? null,
  );

  return db.prepare("SELECT * FROM intel_evidence WHERE id = ?").get(id) as Evidence;
}

/** All evidence rows for an opportunity, newest first. */
export function listEvidence(opportunityId: string): Evidence[] {
  return db
    .prepare(
      "SELECT * FROM intel_evidence WHERE opportunity_id = ? ORDER BY observed_at DESC, created_at DESC",
    )
    .all(opportunityId) as Evidence[];
}

/**
 * Resolve the factor map that scoring consumes: for each factor_key, the most
 * recently observed numeric value that is NOT stale (fresh_until in the past is
 * dropped). Only keys the scorer understands are returned. `asOf` lets callers
 * evaluate freshness deterministically (defaults to now).
 */
export function resolveFactors(opportunityId: string, asOf?: string): FactorMap {
  const now = asOf ?? new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT factor_key, value_num, kind, fresh_until, observed_at
         FROM intel_evidence
        WHERE opportunity_id = ? AND value_num IS NOT NULL
        ORDER BY observed_at DESC, created_at DESC`,
    )
    .all(opportunityId) as Pick<
    Evidence,
    "factor_key" | "value_num" | "kind" | "fresh_until" | "observed_at"
  >[];

  const known = new Set(KNOWN_FACTOR_KEYS);
  const out: FactorMap = {};
  for (const r of rows) {
    if (!known.has(r.factor_key)) continue; // ignore keys the model doesn't score
    if (out[r.factor_key] !== undefined) continue; // rows are newest-first → keep first
    if (r.fresh_until && r.fresh_until < now) continue; // stale → skip
    if (r.value_num === null) continue;
    out[r.factor_key] = { value: r.value_num, kind: r.kind };
  }
  return out;
}
