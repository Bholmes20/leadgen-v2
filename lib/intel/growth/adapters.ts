// Growth-engine data adapters.
//
// CRITICAL: no faked data. Each external integration (Search Console, GA4,
// Google Ads) is a clean interface with an `isAvailable()` check driven by env
// vars. Until credentials are configured, the adapter reports UNAVAILABLE and
// returns nothing — the UI/report shows the integration as not connected rather
// than inventing numbers.
//
// The LEADS adapter IS available today: it reads the real leads/communications
// tables, so the Growth Engine has genuine lead-side signal from day one.

import db from "../../db";
import type { ConnectionState, PerformanceSource } from "../types";

export interface AdapterStatus {
  source: PerformanceSource;
  available: boolean;
  reason: string; // human-readable: why it's (un)available
}

// Richer, dimensional row shape a real Search Console pull will return. Mirrors
// the GSC Search Analytics API: one row per date × page × query × country ×
// device with clicks/impressions/ctr/position. Stored in intel_search_metrics.
export interface SearchAnalyticsRow {
  date: string; // YYYY-MM-DD
  page?: string | null;
  query?: string | null;
  country?: string | null;
  device?: string | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
}

export interface SearchAnalyticsQuery {
  startDate: string; // inclusive YYYY-MM-DD
  endDate: string; // inclusive YYYY-MM-DD
  dimensions?: Array<"date" | "page" | "query" | "country" | "device">;
  rowLimit?: number;
}

export interface PageStat {
  identifier: string; // page slug / path
  impressions?: number;
  clicks?: number;
  ctr?: number;
  position?: number;
  sessions?: number;
  conversions?: number;
}

export interface PerformanceAdapter {
  readonly source: PerformanceSource;
  status(): AdapterStatus;
  isAvailable(): boolean;
  // Returns [] when unavailable. Concrete adapters fetch real data.
  fetchPageStats(): Promise<PageStat[]>;
}

function envSet(...keys: string[]): boolean {
  return keys.every((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

// ── Google Search Console (clean boundary — not yet authenticated) ───────────
// The interface below is the full contract a real GSC client will satisfy.
// Until GSC_SITE_URL + GOOGLE_SERVICE_ACCOUNT_JSON are configured, isAvailable()
// is false and every fetch returns nothing — the report/UI show NOT_CONNECTED
// rather than inventing numbers. Credentials are never logged or exposed.
//
// Required to connect later:
//   • GSC_SITE_URL               — the verified property (e.g. sc-domain:eseeent.com)
//   • GOOGLE_SERVICE_ACCOUNT_JSON — a service account with GSC read access, added
//                                   as a user on the property.
export interface SearchConsoleAdapter extends PerformanceAdapter {
  /** The configured property/site identifier, or null when not connected. */
  property(): string | null;
  connectionState(): ConnectionState;
  /** Dimensional Search Analytics pull. Returns [] until authenticated. */
  fetchSearchAnalytics(query: SearchAnalyticsQuery): Promise<SearchAnalyticsRow[]>;
}

export const searchConsoleAdapter: SearchConsoleAdapter = {
  source: "gsc",
  isAvailable() {
    // A property plus a service account (inline JSON/base64 OR a file path).
    return (
      envSet("GSC_SITE_URL") &&
      (envSet("GOOGLE_SERVICE_ACCOUNT_JSON") || envSet("GOOGLE_SERVICE_ACCOUNT_JSON_PATH"))
    );
  },
  property() {
    const p = process.env.GSC_SITE_URL;
    return typeof p === "string" && p.trim().length > 0 ? p.trim() : null;
  },
  connectionState() {
    return this.isAvailable() ? "CONNECTED" : "NOT_CONNECTED";
  },
  status() {
    return {
      source: "gsc",
      available: this.isAvailable(),
      reason: this.isAvailable()
        ? "Search Console credentials configured"
        : "Not connected — set GSC_SITE_URL + GOOGLE_SERVICE_ACCOUNT_JSON",
    };
  },
  async fetchSearchAnalytics(query) {
    const prop = this.property();
    if (!this.isAvailable() || !prop) return []; // NOT_CONNECTED → nothing, never faked
    // Lazy import avoids loading crypto/client code paths until actually connected.
    const { fetchSearchAnalytics } = await import("./gscClient");
    return fetchSearchAnalytics(prop, query);
  },
  async fetchPageStats() {
    // Page-level stats are derived from ingested intel_search_metrics, not fetched
    // here; this returns nothing (the pageModel reads the store directly).
    return [];
  },
};

// ── Google Analytics 4 Data API ──────────────────────────────────────────────
// Per-page aggregate metrics (sessions / users / pageviews / engagement) pulled
// via the GA4 Data API `runReport`. Until GA4_PROPERTY_ID + a service account
// (inline JSON/base64 OR a file path — same credential the GSC adapter uses) are
// configured, isAvailable() is false and every fetch returns nothing (the report/
// UI show NOT_CONNECTED rather than inventing numbers). Credentials never logged.
//
// Required to connect:
//   • GA4_PROPERTY_ID             — numeric property id (e.g. 123456789)
//   • GOOGLE_SERVICE_ACCOUNT_JSON(_PATH) — a service account added to the GA4
//                                   property with at least Viewer access.

// One row per pagePath, metrics summed across the queried window.
export interface Ga4PageRow {
  pagePath: string | null;
  sessions?: number | null;
  totalUsers?: number | null;
  screenPageViews?: number | null;
  engagementRate?: number | null; // 0..1 (session-weighted over the window)
}

export interface Ga4Query {
  startDate: string; // inclusive YYYY-MM-DD (or a GA4 relative token like "90daysAgo")
  endDate: string; // inclusive YYYY-MM-DD (or "yesterday"/"today")
  rowLimit?: number;
}

export interface Ga4Adapter extends PerformanceAdapter {
  /** The configured numeric property id, or null when not connected. */
  property(): string | null;
  connectionState(): ConnectionState;
  /** Per-page aggregate metrics pull. Returns [] until authenticated. */
  fetchPageMetrics(query: Ga4Query): Promise<Ga4PageRow[]>;
}

export const ga4Adapter: Ga4Adapter = {
  source: "ga4",
  isAvailable() {
    // A property plus a service account (inline JSON/base64 OR a file path) —
    // mirrors the GSC adapter so the same credential works for both.
    return (
      envSet("GA4_PROPERTY_ID") &&
      (envSet("GOOGLE_SERVICE_ACCOUNT_JSON") || envSet("GOOGLE_SERVICE_ACCOUNT_JSON_PATH"))
    );
  },
  property() {
    // Lazy import keeps crypto/client code paths out of the module graph until used.
    const raw = process.env.GA4_PROPERTY_ID;
    if (typeof raw !== "string" || raw.trim().length === 0) return null;
    const digits = raw.trim().replace(/^properties\//, "").trim();
    return /^\d+$/.test(digits) ? digits : null;
  },
  connectionState() {
    return this.isAvailable() ? "CONNECTED" : "NOT_CONNECTED";
  },
  status() {
    const available = this.isAvailable();
    return {
      source: "ga4",
      available,
      reason: available
        ? this.property()
          ? "GA4 Data API credentials configured"
          : "GA4_PROPERTY_ID is set but not a valid numeric property id"
        : "Not connected — set GA4_PROPERTY_ID + GOOGLE_SERVICE_ACCOUNT_JSON(_PATH)",
    };
  },
  async fetchPageMetrics(query) {
    const prop = this.property();
    if (!this.isAvailable() || !prop) return []; // NOT_CONNECTED → nothing, never faked
    const { fetchPageMetrics } = await import("./ga4Client");
    return fetchPageMetrics(prop, query);
  },
  async fetchPageStats() {
    // Convenience: a trailing-28-day per-page snapshot mapped to the generic
    // PageStat shape. Returns [] when not connected. The ingestion path uses
    // fetchPageMetrics() with an explicit window instead.
    const rows = await this.fetchPageMetrics({ startDate: "28daysAgo", endDate: "yesterday" });
    return rows
      .filter((r) => r.pagePath)
      .map((r) => ({ identifier: r.pagePath as string, sessions: r.sessions ?? undefined }));
  },
};

// ── Google Ads API (deferred — interface only) ───────────────────────────────
export const googleAdsAdapter: PerformanceAdapter = {
  source: "google_ads",
  isAvailable() {
    return envSet("GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_REFRESH_TOKEN");
  },
  status() {
    return {
      source: "google_ads",
      available: this.isAvailable(),
      reason: this.isAvailable()
        ? "Google Ads API credentials configured"
        : "Not connected — set GOOGLE_ADS_CUSTOMER_ID + DEVELOPER_TOKEN + REFRESH_TOKEN",
    };
  },
  async fetchPageStats() {
    return [];
  },
};

// ── Leads adapter (AVAILABLE — reads the real CRM tables) ────────────────────
// Aggregates real leads by their attributed SEO landing page (source_page) so
// the Growth Engine can reason about which pages actually convert.
export const leadsAdapter: PerformanceAdapter & {
  fetchLeadStatsByPage(): { identifier: string; leads: number }[];
} = {
  source: "leads",
  isAvailable() {
    return true;
  },
  status() {
    return { source: "leads", available: true, reason: "Reading local CRM leads table" };
  },
  fetchLeadStatsByPage() {
    return db
      .prepare(
        `SELECT COALESCE(source_page, '(unattributed)') AS identifier, COUNT(*) AS leads
           FROM leads
          GROUP BY COALESCE(source_page, '(unattributed)')
          ORDER BY leads DESC`,
      )
      .all() as { identifier: string; leads: number }[];
  },
  async fetchPageStats() {
    return this.fetchLeadStatsByPage().map((r) => ({ identifier: r.identifier, conversions: r.leads }));
  },
};

export const ALL_ADAPTERS: PerformanceAdapter[] = [
  searchConsoleAdapter,
  ga4Adapter,
  googleAdsAdapter,
  leadsAdapter,
];

export function integrationStatus(): AdapterStatus[] {
  return ALL_ADAPTERS.map((a) => a.status());
}
