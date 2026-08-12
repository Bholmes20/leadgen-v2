// Real lead-performance aggregation (P1B, Step 2).
//
// Reusable across market × niche × page × channel × date-range. Reads ONLY the
// real leads table. Where the current schema cannot reliably determine a metric
// (qualification, revenue/job economics), it returns an explicit UNAVAILABLE/
// UNKNOWN marker rather than inventing a definition or a number.
//
// Unknown/unmapped leads are counted and surfaced, never silently discarded.

import db from "../../db";
import { marketBySeoSlug, nicheBySlug, resolveMarket, resolveNiche, UNATTRIBUTED } from "../mapping";
import type { DataQuality } from "../types";

// A number that always travels with its provenance label.
export interface MetricValue {
  value: number | null;
  quality: DataQuality; // MEASURED | DERIVED | ESTIMATED | UNKNOWN
  note?: string;
}

export interface LeadPerformanceFilter {
  market?: string | null; // lib/seo city slug (leads.city)
  niche?: string | null; // lib/seo niche slug (leads.niche)
  page?: string | null; // source_page (leading slash optional)
  source?: string | null; // utm_source
  from?: string | null; // inclusive YYYY-MM-DD
  to?: string | null; // inclusive YYYY-MM-DD (end of day)
}

export interface Distribution {
  identifier: string;
  leads: number;
  mapped?: boolean; // for city/niche: did it resolve to an intel row?
}

// Canonical lifecycle buckets derived from the real leads.status values in use.
// (Qualification is intentionally NOT inferred from status — see `qualified`.)
export const STATUS_BUCKETS: Record<string, string> = {
  NEW: "new",
  CONTACTED: "contacted",
  REVIEWED: "contacted",
  ROUTED: "contacted",
  SENT: "contacted",
  QUOTED: "quoted",
  BOOKED: "won",
  WON: "won",
  COMPLETED: "won",
  LOST: "lost",
  STALE: "lost",
};

export interface LeadPerformance {
  filter: LeadPerformanceFilter;
  totalLeads: number;
  byStatus: Record<string, number>; // normalized status → count
  byBucket: Record<string, number>; // lifecycle bucket → count
  qualified: MetricValue; // UNAVAILABLE: no reliable qualification field in schema
  conversion: {
    contactRate: MetricValue; // contacted-or-further / total
    quoteRate: MetricValue; // quoted-or-further / total
    winRate: MetricValue; // won / total
  };
  bySource: Distribution[]; // utm_source
  byMedium: Distribution[]; // utm_medium
  byCampaign: Distribution[]; // utm_campaign
  byCity: Distribution[]; // leads.city (mapped flag vs intel_markets)
  byNiche: Distribution[]; // leads.niche (mapped flag vs intel_niches)
  byPage: Distribution[]; // source_page
  unattributedLeads: number; // no city AND no niche AND no source_page
  unmappedCityLeads: number; // has city slug but no matching intel market
  unmappedNicheLeads: number; // has niche slug but no matching intel niche
  timeToContact: MetricValue; // DERIVED avg hours, or UNKNOWN
  revenue: MetricValue; // UNAVAILABLE until projects/job-economics exist
}

function normalizeStatus(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase() || "NEW";
}

// Build a parameterized WHERE clause from the filter. Column names are fixed
// literals here (never interpolated from input) — only values are bound.
function buildWhere(filter: LeadPerformanceFilter): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.market) {
    clauses.push("LOWER(city) = ?");
    params.push(filter.market.trim().toLowerCase());
  }
  if (filter.niche) {
    clauses.push("LOWER(niche) = ?");
    params.push(filter.niche.trim().toLowerCase());
  }
  if (filter.page) {
    const p = filter.page.trim().toLowerCase();
    // Match with or without a leading slash (source_page is stored as "/slug").
    clauses.push("(LOWER(source_page) = ? OR LOWER(source_page) = ?)");
    params.push(p, p.startsWith("/") ? p.slice(1) : `/${p}`);
  }
  if (filter.source) {
    clauses.push("LOWER(utm_source) = ?");
    params.push(filter.source.trim().toLowerCase());
  }
  if (filter.from) {
    clauses.push("created_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("created_at <= ?");
    params.push(`${filter.to} 23:59:59`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

// Simple grouped counts for a fixed column, honoring the same filter.
function groupBy(column: "utm_source" | "utm_medium" | "utm_campaign" | "source_page", where: string, params: unknown[]): Distribution[] {
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(${column}), ''), '${UNATTRIBUTED}') AS identifier, COUNT(*) AS leads
         FROM leads ${where}
        GROUP BY identifier
        ORDER BY leads DESC`,
    )
    .all(...params) as Distribution[];
}

/**
 * Aggregate real lead performance under an optional filter. Every rate is DERIVED
 * from measured counts; qualification and revenue stay UNAVAILABLE because the
 * production schema has no reliable field for them yet.
 */
export function getLeadPerformance(filter: LeadPerformanceFilter = {}): LeadPerformance {
  const { sql: where, params } = buildWhere(filter);

  const total = (db.prepare(`SELECT COUNT(*) AS n FROM leads ${where}`).get(...params) as { n: number }).n;

  // Status distribution → normalized + bucketed.
  const statusRows = db
    .prepare(`SELECT status, COUNT(*) AS n FROM leads ${where} GROUP BY status`)
    .all(...params) as { status: string | null; n: number }[];
  const byStatus: Record<string, number> = {};
  const byBucket: Record<string, number> = {};
  for (const r of statusRows) {
    const s = normalizeStatus(r.status);
    byStatus[s] = (byStatus[s] ?? 0) + r.n;
    const bucket = STATUS_BUCKETS[s] ?? "other";
    byBucket[bucket] = (byBucket[bucket] ?? 0) + r.n;
  }

  const rate = (numerator: number): MetricValue =>
    total > 0
      ? { value: numerator / total, quality: "DERIVED" }
      : { value: null, quality: "UNKNOWN", note: "No leads in range" };

  const contactedPlus =
    (byBucket.contacted ?? 0) + (byBucket.quoted ?? 0) + (byBucket.won ?? 0);
  const quotedPlus = (byBucket.quoted ?? 0) + (byBucket.won ?? 0);
  const won = byBucket.won ?? 0;

  // City distribution with intel mapping flags (built once, not per row).
  const marketIdx = marketBySeoSlug();
  const cityRows = db
    .prepare(`SELECT city, COUNT(*) AS leads FROM leads ${where} GROUP BY city ORDER BY leads DESC`)
    .all(...params) as { city: string | null; leads: number }[];
  let unmappedCityLeads = 0;
  const byCity: Distribution[] = cityRows.map((r) => {
    if (!r.city) return { identifier: UNATTRIBUTED, leads: r.leads, mapped: false };
    const m = resolveMarket(r.city, marketIdx);
    if (!m.mapped) unmappedCityLeads += r.leads;
    return { identifier: m.citySlug ?? UNATTRIBUTED, leads: r.leads, mapped: m.mapped };
  });

  const nicheIdx = nicheBySlug();
  const nicheRows = db
    .prepare(`SELECT niche, COUNT(*) AS leads FROM leads ${where} GROUP BY niche ORDER BY leads DESC`)
    .all(...params) as { niche: string | null; leads: number }[];
  let unmappedNicheLeads = 0;
  const byNiche: Distribution[] = nicheRows.map((r) => {
    if (!r.niche) return { identifier: UNATTRIBUTED, leads: r.leads, mapped: false };
    const n = resolveNiche(r.niche, nicheIdx);
    if (!n.mapped) unmappedNicheLeads += r.leads;
    return { identifier: n.nicheSlug ?? UNATTRIBUTED, leads: r.leads, mapped: n.mapped };
  });

  const unattributedLeads = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM leads ${where ? `${where} AND` : "WHERE"}
           (city IS NULL OR TRIM(city) = '')
           AND (niche IS NULL OR TRIM(niche) = '')
           AND (source_page IS NULL OR TRIM(source_page) = '')`,
      )
      .get(...params) as { n: number }
  ).n;

  // Time-to-contact: DERIVED from real timestamps where present, else UNKNOWN.
  const ttcRow = db
    .prepare(
      `SELECT COUNT(*) AS n,
              AVG((julianday(last_contacted_at) - julianday(created_at)) * 24.0) AS avg_hours
         FROM leads ${where ? `${where} AND` : "WHERE"}
              last_contacted_at IS NOT NULL AND TRIM(last_contacted_at) <> ''`,
    )
    .get(...params) as { n: number; avg_hours: number | null };
  const timeToContact: MetricValue =
    ttcRow.n > 0 && ttcRow.avg_hours != null
      ? { value: ttcRow.avg_hours, quality: "DERIVED", note: `hours, from ${ttcRow.n} contacted lead(s)` }
      : { value: null, quality: "UNKNOWN", note: "No leads have last_contacted_at recorded" };

  return {
    filter,
    totalLeads: total,
    byStatus,
    byBucket,
    qualified: {
      value: null,
      quality: "UNKNOWN",
      note: "No reliable qualification field in the leads schema (sales-opportunities table is unused).",
    },
    conversion: {
      contactRate: rate(contactedPlus),
      quoteRate: rate(quotedPlus),
      winRate: rate(won),
    },
    bySource: groupBy("utm_source", where, params),
    byMedium: groupBy("utm_medium", where, params),
    byCampaign: groupBy("utm_campaign", where, params),
    byCity,
    byNiche,
    byPage: groupBy("source_page", where, params),
    unattributedLeads,
    unmappedCityLeads,
    unmappedNicheLeads,
    timeToContact,
    revenue: {
      value: null,
      quality: "UNKNOWN",
      note: "Revenue/job economics UNAVAILABLE — projects table has no completed jobs with actual_revenue.",
    },
  };
}
