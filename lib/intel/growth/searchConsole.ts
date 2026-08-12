// Search Console ingestion pipeline (P1B, Step 4).
//
// Designed for INCREMENTAL ingestion: a per-(source, property) cursor in
// intel_ingestion_state records the high-water date so we never rebuild all
// history. Rows land in intel_search_metrics with full provenance (source,
// property, fetched_at, dimensions).
//
// Today GSC is NOT_CONNECTED, so ingestSearchConsole() is a clean no-op that
// records status = NOT_CONNECTED and fabricates nothing. When credentials are
// added, the same orchestration pulls real rows via the adapter and upserts them.

import db from "../../db";
import { v4 as uuidv4 } from "uuid";
import { searchConsoleAdapter, type SearchAnalyticsRow } from "./adapters";
import { safeRecordActivity } from "../activity";
import type { IngestionState } from "../types";

export interface IngestResult {
  source: "gsc";
  status: "SUCCESS" | "NOT_CONNECTED" | "FAILED";
  property: string | null;
  rowsIngested: number;
  fromDate: string | null;
  toDate: string | null;
  reason: string;
}

/** Read the incremental cursor for a source/property, if any. */
export function getIngestionState(source: string, property: string): IngestionState | undefined {
  return db
    .prepare("SELECT * FROM intel_ingestion_state WHERE source = ? AND property = ?")
    .get(source, property) as IngestionState | undefined;
}

/** Upsert the incremental cursor. */
export function setIngestionState(input: {
  source: string;
  property: string;
  last_ingested_date?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  rows_ingested?: number;
}): void {
  const existing = getIngestionState(input.source, input.property);
  if (existing) {
    db.prepare(
      `UPDATE intel_ingestion_state
          SET last_ingested_date = COALESCE(?, last_ingested_date),
              last_run_at = ?, last_status = ?, last_error = ?,
              rows_ingested = rows_ingested + ?
        WHERE id = ?`,
    ).run(
      input.last_ingested_date ?? null,
      input.last_run_at ?? null,
      input.last_status ?? null,
      input.last_error ?? null,
      input.rows_ingested ?? 0,
      existing.id,
    );
    return;
  }
  db.prepare(
    `INSERT INTO intel_ingestion_state
       (id, source, property, last_ingested_date, last_run_at, last_status, last_error, rows_ingested)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    uuidv4(),
    input.source,
    input.property,
    input.last_ingested_date ?? null,
    input.last_run_at ?? null,
    input.last_status ?? null,
    input.last_error ?? null,
    input.rows_ingested ?? 0,
  );
}

/**
 * Idempotent upsert of dimensional search rows (provenance-tagged). The UNIQUE
 * (property, date, page, query, country, device) constraint means re-ingesting an
 * overlapping window updates rather than duplicates. Returns rows written.
 */
export function upsertSearchMetrics(property: string, rows: SearchAnalyticsRow[], fetchedAt?: string): number {
  const now = fetchedAt ?? new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO intel_search_metrics
       (id, source, property, date, page, query, country, device, clicks, impressions, ctr, position, fetched_at)
     VALUES (?, 'gsc', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(property, date, page, query, country, device) DO UPDATE SET
       clicks = excluded.clicks, impressions = excluded.impressions,
       ctr = excluded.ctr, position = excluded.position, fetched_at = excluded.fetched_at`,
  );
  const tx = db.transaction((batch: SearchAnalyticsRow[]) => {
    for (const r of batch) {
      stmt.run(
        uuidv4(),
        property,
        r.date,
        r.page ?? null,
        r.query ?? null,
        r.country ?? null,
        r.device ?? null,
        r.clicks ?? null,
        r.impressions ?? null,
        r.ctr ?? null,
        r.position ?? null,
        now,
      );
    }
  });
  tx(rows);
  return rows.length;
}

/**
 * Orchestrate one incremental Search Console pull. No-op (NOT_CONNECTED) until
 * credentials exist. `now`/`lookbackDays` are injectable for deterministic tests.
 */
export async function ingestSearchConsole(opts: { now?: string; lookbackDays?: number } = {}): Promise<IngestResult> {
  const property = searchConsoleAdapter.property();
  const runAt = opts.now ?? new Date().toISOString();

  if (!searchConsoleAdapter.isAvailable() || !property) {
    if (property) {
      setIngestionState({ source: "gsc", property, last_run_at: runAt, last_status: "NOT_CONNECTED" });
    }
    return {
      source: "gsc",
      status: "NOT_CONNECTED",
      property,
      rowsIngested: 0,
      fromDate: null,
      toDate: null,
      reason: "Search Console not connected — set GSC_SITE_URL + GOOGLE_SERVICE_ACCOUNT_JSON.",
    };
  }

  // Incremental window: from the day after the cursor (or lookback) to yesterday.
  const cursor = getIngestionState("gsc", property);
  const lookback = opts.lookbackDays ?? 90;
  const end = dayString(addDays(runAt, -1)); // GSC data lags ~1–2 days
  const start = cursor?.last_ingested_date
    ? dayString(addDays(`${cursor.last_ingested_date}T00:00:00Z`, 1))
    : dayString(addDays(runAt, -lookback));

  try {
    const rows = await searchConsoleAdapter.fetchSearchAnalytics({
      startDate: start,
      endDate: end,
      dimensions: ["date", "page", "query"],
    });
    const written = upsertSearchMetrics(property, rows, runAt);
    const maxDate = rows.reduce<string | null>((m, r) => (m == null || r.date > m ? r.date : m), null);
    setIngestionState({
      source: "gsc",
      property,
      last_ingested_date: maxDate ?? cursor?.last_ingested_date ?? null,
      last_run_at: runAt,
      last_status: "SUCCESS",
      last_error: null,
      rows_ingested: written,
    });
    safeRecordActivity({
      event_type: "DATA_INGESTION_COMPLETED",
      actor_type: "system",
      actor_name: "gsc-ingest",
      target_type: "ingestion",
      target_id: "gsc",
      title: `Search Console ingest: ${written} rows`,
      summary: `Window ${start}..${end} for ${property}.`,
      metadata: { rows: written, start, end },
      severity: "info",
    });
    return { source: "gsc", status: "SUCCESS", property, rowsIngested: written, fromDate: start, toDate: end, reason: "OK" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    setIngestionState({ source: "gsc", property, last_run_at: runAt, last_status: "FAILED", last_error: message });
    safeRecordActivity({
      event_type: "DATA_INGESTION_FAILED",
      actor_type: "system",
      actor_name: "gsc-ingest",
      target_type: "ingestion",
      target_id: "gsc",
      title: "Search Console ingest failed",
      summary: message,
      severity: "warning",
    });
    return { source: "gsc", status: "FAILED", property, rowsIngested: 0, fromDate: start, toDate: end, reason: message };
  }
}

// ── tiny date helpers (UTC, deterministic) ───────────────────────────────────
function addDays(iso: string, days: number): number {
  return Date.parse(iso) + days * 86_400_000;
}
function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
