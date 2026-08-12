// Experiment service — validate an opportunity with a real test before scaling.
//
// Eventually ACTUAL business results (from these experiments) outrank the
// research score. Metrics are stored as an append-only time series; derived
// figures (CPL, CAC, conversion rate, gross profit) are COMPUTED here, never
// stored as if they were raw facts.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import type {
  Experiment,
  ExperimentMetric,
  ExperimentStatus,
  AcquisitionChannel,
  PerformanceSource,
} from "./types";
import { getOpportunity } from "./opportunities";
import { safeRecordActivity } from "./activity";

export interface ExperimentInput {
  opportunity_id: string;
  hypothesis: string;
  channel: AcquisitionChannel;
  test_budget?: number | null; // cents
  start_date?: string | null;
  end_date?: string | null;
  landing_pages?: string[] | null;
  status?: ExperimentStatus;
}

export function createExperiment(input: ExperimentInput): Experiment {
  if (!getOpportunity(input.opportunity_id)) {
    throw new Error(`Unknown opportunity: ${input.opportunity_id}`);
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_experiments
       (id, opportunity_id, hypothesis, channel, test_budget, start_date, end_date, landing_pages, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.opportunity_id,
    input.hypothesis,
    input.channel,
    input.test_budget ?? null,
    input.start_date ?? null,
    input.end_date ?? null,
    input.landing_pages ? JSON.stringify(input.landing_pages) : null,
    input.status ?? "PLANNED",
  );

  const opp = getOpportunity(input.opportunity_id);
  safeRecordActivity({
    event_type: "EXPERIMENT_CREATED",
    actor_type: "system",
    actor_name: "growth-engine",
    target_type: "experiment",
    target_id: id,
    experiment_id: id,
    opportunity_id: input.opportunity_id,
    market_id: opp?.market_id ?? null,
    niche_id: opp?.niche_id ?? null,
    title: `Experiment planned (${input.channel})`,
    summary: input.hypothesis,
    metadata: { channel: input.channel, test_budget: input.test_budget ?? null },
    severity: "info",
  });

  return getExperiment(id)!;
}

export function getExperiment(id: string): Experiment | undefined {
  return db.prepare("SELECT * FROM intel_experiments WHERE id = ?").get(id) as
    | Experiment
    | undefined;
}

export function listExperiments(opportunityId?: string): Experiment[] {
  if (opportunityId) {
    return db
      .prepare("SELECT * FROM intel_experiments WHERE opportunity_id = ? ORDER BY created_at DESC")
      .all(opportunityId) as Experiment[];
  }
  return db.prepare("SELECT * FROM intel_experiments ORDER BY created_at DESC").all() as Experiment[];
}

export function updateExperimentStatus(
  id: string,
  status: ExperimentStatus,
  outcome?: string | null,
  lessons?: string | null,
): Experiment {
  db.prepare(
    "UPDATE intel_experiments SET status = ?, outcome = COALESCE(?, outcome), lessons = COALESCE(?, lessons) WHERE id = ?",
  ).run(status, outcome ?? null, lessons ?? null, id);
  const exp = getExperiment(id);
  if (!exp) throw new Error(`Unknown experiment: ${id}`);

  if (status === "RUNNING" || status === "COMPLETED") {
    const opp = getOpportunity(exp.opportunity_id);
    safeRecordActivity({
      event_type: status === "RUNNING" ? "EXPERIMENT_STARTED" : "EXPERIMENT_COMPLETED",
      actor_type: "system",
      actor_name: "growth-engine",
      target_type: "experiment",
      target_id: id,
      experiment_id: id,
      opportunity_id: exp.opportunity_id,
      market_id: opp?.market_id ?? null,
      niche_id: opp?.niche_id ?? null,
      title: status === "RUNNING" ? "Experiment started" : "Experiment completed",
      summary: outcome ?? exp.hypothesis,
      metadata: { status },
      severity: "info",
    });
  }

  return exp;
}

export interface MetricInput {
  experiment_id: string;
  as_of: string;
  source: PerformanceSource;
  impressions?: number | null;
  clicks?: number | null;
  sessions?: number | null;
  calls?: number | null;
  forms?: number | null;
  qualified_leads?: number | null;
  quotes?: number | null;
  booked_jobs?: number | null;
  revenue?: number | null; // cents
  contractor_cost?: number | null; // cents
  ad_spend?: number | null; // cents
}

export function recordExperimentMetrics(input: MetricInput): ExperimentMetric {
  if (!getExperiment(input.experiment_id)) {
    throw new Error(`Unknown experiment: ${input.experiment_id}`);
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_experiment_metrics
       (id, experiment_id, as_of, source, impressions, clicks, sessions, calls, forms,
        qualified_leads, quotes, booked_jobs, revenue, contractor_cost, ad_spend)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.experiment_id,
    input.as_of,
    input.source,
    input.impressions ?? null,
    input.clicks ?? null,
    input.sessions ?? null,
    input.calls ?? null,
    input.forms ?? null,
    input.qualified_leads ?? null,
    input.quotes ?? null,
    input.booked_jobs ?? null,
    input.revenue ?? null,
    input.contractor_cost ?? null,
    input.ad_spend ?? null,
  );
  return db.prepare("SELECT * FROM intel_experiment_metrics WHERE id = ?").get(id) as ExperimentMetric;
}

export interface ExperimentSummary {
  experiment_id: string;
  impressions: number;
  clicks: number;
  sessions: number;
  leads: number;
  quotes: number;
  bookedJobs: number;
  revenue: number; // cents
  adSpend: number; // cents
  contractorCost: number; // cents
  grossProfit: number; // cents (revenue - contractorCost - adSpend)
  cpl: number | null; // cents per qualified lead
  cac: number | null; // cents per booked job
  conversionRate: number | null; // booked jobs / leads
  hasData: boolean;
}

const sum = (rows: ExperimentMetric[], k: keyof ExperimentMetric): number =>
  rows.reduce((n, r) => n + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);

/**
 * Aggregate an experiment's metrics and compute derived economics. Derived
 * figures are null when their denominator is zero — we never fabricate a ratio.
 */
export function summarizeExperiment(experimentId: string): ExperimentSummary {
  const rows = db
    .prepare("SELECT * FROM intel_experiment_metrics WHERE experiment_id = ?")
    .all(experimentId) as ExperimentMetric[];

  const leads = sum(rows, "qualified_leads");
  const bookedJobs = sum(rows, "booked_jobs");
  const revenue = sum(rows, "revenue");
  const adSpend = sum(rows, "ad_spend");
  const contractorCost = sum(rows, "contractor_cost");

  return {
    experiment_id: experimentId,
    impressions: sum(rows, "impressions"),
    clicks: sum(rows, "clicks"),
    sessions: sum(rows, "sessions"),
    leads,
    quotes: sum(rows, "quotes"),
    bookedJobs,
    revenue,
    adSpend,
    contractorCost,
    grossProfit: revenue - contractorCost - adSpend,
    cpl: leads > 0 ? Math.round(adSpend / leads) : null,
    cac: bookedJobs > 0 ? Math.round(adSpend / bookedJobs) : null,
    conversionRate: leads > 0 ? bookedJobs / leads : null,
    hasData: rows.length > 0,
  };
}
