// System-status reporting (P1B, Step 9/10).
//
// A single honest answer to "what is connected and what is the system currently
// holding?" — used by the dashboard and the future worker. Every integration is
// reported as CONNECTED / NOT_CONNECTED / UNAVAILABLE with no fabrication.

import db from "../db";
import { integrationStatus } from "./growth/adapters";
import type { AdapterStatus } from "./growth/adapters";
import type { ConnectionState } from "./types";

export interface IntegrationStatusLine {
  key: string;
  label: string;
  state: ConnectionState;
  detail: string;
}

export interface SystemStatus {
  generatedAt: string;
  integrations: IntegrationStatusLine[];
  adapters: AdapterStatus[]; // raw adapter view (gsc/ga4/google_ads/leads)
  counts: {
    markets: number;
    niches: number;
    opportunities: number;
    scoredOpportunities: number;
    openRecommendations: number;
    openSignals: number;
    activityEvents: number;
    leads: number;
  };
}

function count(sql: string): number {
  return (db.prepare(sql).get() as { n: number }).n;
}

/** Availability of revenue/job economics — currently derived from the projects table. */
function revenueState(): IntegrationStatusLine {
  let realized = 0;
  try {
    realized = count("SELECT COUNT(*) AS n FROM projects WHERE actual_revenue IS NOT NULL");
  } catch {
    realized = 0; // projects table absent in some test DBs
  }
  return {
    key: "revenue",
    label: "Revenue / job economics",
    state: realized > 0 ? "CONNECTED" : "UNAVAILABLE",
    detail:
      realized > 0
        ? `${realized} completed job(s) with actual_revenue`
        : "No completed jobs with actual_revenue yet — economics UNAVAILABLE",
  };
}

export function getSystemStatus(generatedAt?: string): SystemStatus {
  const adapters = integrationStatus();
  const adapterState = (source: string): ConnectionState => {
    const a = adapters.find((x) => x.source === source);
    if (source === "leads") return a?.available ? "CONNECTED" : "UNAVAILABLE";
    return a?.available ? "CONNECTED" : "NOT_CONNECTED";
  };
  const detail = (source: string) => adapters.find((x) => x.source === source)?.reason ?? "";

  const integrations: IntegrationStatusLine[] = [
    { key: "leads", label: "Lead intelligence", state: adapterState("leads"), detail: detail("leads") },
    { key: "gsc", label: "Search Console", state: adapterState("gsc"), detail: detail("gsc") },
    { key: "ga4", label: "GA4", state: adapterState("ga4"), detail: detail("ga4") },
    { key: "google_ads", label: "Google Ads", state: adapterState("google_ads"), detail: detail("google_ads") },
    revenueState(),
  ];

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    integrations,
    adapters,
    counts: {
      markets: count("SELECT COUNT(*) AS n FROM intel_markets"),
      niches: count("SELECT COUNT(*) AS n FROM intel_niches"),
      opportunities: count("SELECT COUNT(*) AS n FROM intel_opportunities"),
      scoredOpportunities: count("SELECT COUNT(*) AS n FROM intel_opportunities WHERE score_overall IS NOT NULL"),
      openRecommendations: count("SELECT COUNT(*) AS n FROM intel_recommendations WHERE status = 'PROPOSED'"),
      openSignals: count("SELECT COUNT(*) AS n FROM intel_signals WHERE status = 'OPEN'"),
      activityEvents: count("SELECT COUNT(*) AS n FROM intel_activity_events"),
      leads: count("SELECT COUNT(*) AS n FROM leads"),
    },
  };
}
