// GA4 (Google Analytics 4) ingestion pipeline (P1E).
//
// Mirrors searchConsole.ts. Pulls per-page aggregate metrics via the GA4 Data API
// and records them as growth-performance SNAPSHOTS in intel_performance (scope
// 'page', source 'ga4'). intel_performance is a snapshot store — getPagePerformance
// keeps the newest snapshot per (page, source) — so each run writes ONE aggregate
// row per page as of the window end, not daily granular rows.
//
// A per-(source, property) cursor in intel_ingestion_state records the high-water
// date. Writes are idempotent: the UNIQUE (scope, identifier, source, as_of) index
// means re-running the same window upserts rather than duplicating.
//
// Until GA4 is connected (GA4_PROPERTY_ID + service account), ingestGa4() is a clean
// no-op that records status = NOT_CONNECTED and fabricates nothing.

import db from "../../db";
import { v4 as uuidv4 } from "uuid";
import { ga4Adapter, type Ga4PageRow } from "./adapters";
import { getIngestionState, setIngestionState } from "./searchConsole";
import { safeRecordActivity } from "../activity";
import { normalizeSlug } from "../mapping";

export interface Ga4IngestResult {
  source: "ga4";
  status: "SUCCESS" | "NOT_CONNECTED" | "FAILED";
  property: string | null;
  rowsIngested: number;
  fromDate: string | null;
  toDate: string | null;
  reason: string;
}

/**
 * Idempotent upsert of per-page GA4 snapshots into intel_performance. The UNIQUE
 * (scope, identifier, source, as_of) index means re-ingesting the same window
 * updates rather than duplicates. `asOf` is the window end (YYYY-MM-DD). Only rows
 * with a resolvable page slug are written. Returns rows written.
 */
export function upsertGa4Snapshots(property: string, rows: Ga4PageRow[], asOf: string): number {
  const stmt = db.prepare(
    `INSERT INTO intel_performance
       (id, scope, identifier, source, as_of, sessions, conversions)
     VALUES (?, 'page', ?, 'ga4', ?, ?, NULL)
     ON CONFLICT(scope, identifier, source, as_of) DO UPDATE SET
       sessions = excluded.sessions`,
  );
  let written = 0;
  const tx = db.transaction((batch: Ga4PageRow[]) => {
    for (const r of batch) {
      // Normalize the GA4 pagePath to the same slug convention used by lead
      // attribution (source_page) so page-level signals can join them.
      const slug = r.pagePath ? normalizeSlug(r.pagePath) : null;
      if (!slug) continue; // skip root / unresolvable paths — never fabricate an id
      stmt.run(uuidv4(), slug, asOf, r.sessions ?? null);
      written += 1;
    }
  });
  tx(rows);
  return written;
}

export interface Ga4IngestOptions {
  now?: string; // injectable clock (ISO) for deterministic tests
  lookbackDays?: number; // window size when no cursor exists (default 90)
  startDate?: string; // explicit range start (recovery/debug) — overrides cursor
  endDate?: string; // explicit range end
}

/**
 * Orchestrate one GA4 pull. No-op (NOT_CONNECTED) until credentials + a property
 * exist. Idempotent: re-ingesting an overlapping window upserts.
 *  - default: window = [runAt - lookbackDays, yesterday]
 *  - startDate/endDate given: explicit range (recovery/debug)
 */
export async function ingestGa4(opts: Ga4IngestOptions = {}): Promise<Ga4IngestResult> {
  const property = ga4Adapter.property();
  const runAt = opts.now ?? new Date().toISOString();

  if (!ga4Adapter.isAvailable() || !property) {
    if (property) {
      setIngestionState({ source: "ga4", property, last_run_at: runAt, last_status: "NOT_CONNECTED" });
    }
    return {
      source: "ga4",
      status: "NOT_CONNECTED",
      property,
      rowsIngested: 0,
      fromDate: null,
      toDate: null,
      reason: "GA4 not connected — set GA4_PROPERTY_ID + GOOGLE_SERVICE_ACCOUNT_JSON(_PATH).",
    };
  }

  const lookback = opts.lookbackDays ?? 90;
  // GA4 data settles quickly; default end = yesterday for stable numbers.
  const end = opts.endDate ?? dayString(addDays(runAt, -1));
  const start = opts.startDate ?? dayString(addDays(runAt, -lookback));

  safeRecordActivity({
    event_type: "GA4_INGESTION_STARTED",
    actor_type: "system",
    actor_name: "ga4-ingest",
    target_type: "ingestion",
    target_id: "ga4",
    title: "GA4 ingest started",
    summary: `Window ${start}..${end} for property ${property}.`,
    metadata: { start, end },
    severity: "info",
  });

  try {
    const rows = await ga4Adapter.fetchPageMetrics({ startDate: start, endDate: end });
    const written = upsertGa4Snapshots(property, rows, end);
    setIngestionState({
      source: "ga4",
      property,
      last_ingested_date: end,
      last_run_at: runAt,
      last_status: "SUCCESS",
      last_error: null,
      rows_ingested: written,
    });
    safeRecordActivity({
      event_type: "GA4_INGESTION_COMPLETED",
      actor_type: "system",
      actor_name: "ga4-ingest",
      target_type: "ingestion",
      target_id: "ga4",
      title: `GA4 ingest: ${written} page snapshots`,
      summary: `Window ${start}..${end} for property ${property}.`,
      metadata: { rows: written, start, end },
      severity: "info",
    });
    return { source: "ga4", status: "SUCCESS", property, rowsIngested: written, fromDate: start, toDate: end, reason: "OK" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    setIngestionState({ source: "ga4", property, last_run_at: runAt, last_status: "FAILED", last_error: message });
    safeRecordActivity({
      event_type: "GA4_INGESTION_FAILED",
      actor_type: "system",
      actor_name: "ga4-ingest",
      target_type: "ingestion",
      target_id: "ga4",
      title: "GA4 ingest failed",
      summary: message,
      severity: "warning",
    });
    return { source: "ga4", status: "FAILED", property, rowsIngested: 0, fromDate: start, toDate: end, reason: message };
  }
}

/** Initial backfill — pulls a wide history window in one pass. */
export function backfillGa4(opts: { days?: number; now?: string } = {}): Promise<Ga4IngestResult> {
  return ingestGa4({ lookbackDays: opts.days ?? 90, now: opts.now });
}

/** Explicit date-range GA4 ingest for recovery/debugging. Idempotent. */
export function ingestGa4Range(startDate: string, endDate: string, now?: string): Promise<Ga4IngestResult> {
  return ingestGa4({ startDate, endDate, now });
}

/** Read the GA4 ingestion cursor, if any. */
export function getGa4IngestionState(property: string) {
  return getIngestionState("ga4", property);
}

// ── tiny date helpers (UTC, deterministic) — match searchConsole.ts ──────────
function addDays(iso: string, days: number): number {
  return Date.parse(iso) + days * 86_400_000;
}
function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
