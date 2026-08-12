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
import type { PerformanceSource } from "../types";

export interface AdapterStatus {
  source: PerformanceSource;
  available: boolean;
  reason: string; // human-readable: why it's (un)available
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

// ── Google Search Console (deferred — interface only) ────────────────────────
export const searchConsoleAdapter: PerformanceAdapter = {
  source: "gsc",
  isAvailable() {
    return envSet("GSC_SITE_URL", "GOOGLE_SERVICE_ACCOUNT_JSON");
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
  async fetchPageStats() {
    // Deferred to P1B. Intentionally returns nothing until wired to the real API.
    return [];
  },
};

// ── GA4 Data API (deferred — interface only) ─────────────────────────────────
export const ga4Adapter: PerformanceAdapter = {
  source: "ga4",
  isAvailable() {
    return envSet("GA4_PROPERTY_ID", "GOOGLE_SERVICE_ACCOUNT_JSON");
  },
  status() {
    return {
      source: "ga4",
      available: this.isAvailable(),
      reason: this.isAvailable()
        ? "GA4 Data API credentials configured"
        : "Not connected — set GA4_PROPERTY_ID + GOOGLE_SERVICE_ACCOUNT_JSON",
    };
  },
  async fetchPageStats() {
    return [];
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
