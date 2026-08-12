// Weekly Growth Report — machine-readable + human-readable.
//
// A future worker (via Alfred/James) can send the text form to Slack and store
// the JSON form. Slack delivery itself is deferred (Step 9): this only builds the
// report from real stored data. Sections with no data say so honestly.

import {
  listTopOpportunities,
  type OpportunityWithContext,
} from "./opportunities";
import { listRecommendations } from "./recommendations";
import { getMarketPerformance } from "./growth";
import { integrationStatus } from "./growth/adapters";
import { listExperiments, summarizeExperiment } from "./experiments";
import type { AdapterStatus } from "./growth/adapters";
import type { Recommendation } from "./types";

export interface GrowthReport {
  generatedAt: string;
  winning: OpportunityWithContext[];
  losing: OpportunityWithContext[];
  topOpportunities: OpportunityWithContext[];
  leadsByMarket: { identifier: string; leads: number }[];
  experiments: { hypothesis: string; status: string; grossProfit: number; leads: number }[];
  recommendedActions: Recommendation[];
  approvalsNeeded: Recommendation[];
  integrations: AdapterStatus[];
}

export interface BuiltReport {
  json: GrowthReport;
  text: string;
}

/** Build the report from current stored data. `generatedAt` is injectable for tests. */
export function buildWeeklyReport(generatedAt?: string): BuiltReport {
  const when = generatedAt ?? new Date().toISOString();
  const top = listTopOpportunities(10);

  // "Winning" = validated/scaling; "losing" = scored but deprioritized/paused/rejected.
  const winning = top.filter((o) => o.stage === "VALIDATED" || o.stage === "SCALE");
  const losing = listTopOpportunities(50).filter(
    (o) => o.verdict === "DEPRIORITIZE" || o.stage === "PAUSED",
  );

  const leadsByMarket = getMarketPerformance();

  const experiments = listExperiments().map((e) => {
    const s = summarizeExperiment(e.id);
    return { hypothesis: e.hypothesis, status: e.status, grossProfit: s.grossProfit, leads: s.leads };
  });

  const proposed = listRecommendations("PROPOSED");
  const approvalsNeeded = proposed.filter((r) =>
    ["TEST_MARKET", "TEST_NICHE", "TEST_PAID_TRAFFIC", "EXPAND_MARKET", "REVIEW_PRICING"].includes(r.type),
  );

  const json: GrowthReport = {
    generatedAt: when,
    winning,
    losing: losing.slice(0, 10),
    topOpportunities: top,
    leadsByMarket,
    experiments,
    recommendedActions: proposed.slice(0, 5),
    approvalsNeeded,
    integrations: integrationStatus(),
  };

  return { json, text: renderText(json) };
}

const dollars = (cents: number): string => `$${(cents / 100).toFixed(0)}`;

function renderText(r: GrowthReport): string {
  const lines: string[] = [];
  const section = (title: string) => {
    lines.push("", title, "─".repeat(title.length));
  };
  const bullet = (s: string) => lines.push(`• ${s}`);
  const none = () => lines.push("  (none yet)");

  lines.push("ESEE GROWTH REPORT", `Generated: ${r.generatedAt}`);

  section("WHERE WE'RE WINNING");
  if (r.winning.length) r.winning.forEach((o) => bullet(`${o.niche_label} — ${o.market_city}, ${o.market_state} (${o.stage})`));
  else none();

  section("WHERE WE'RE LOSING");
  if (r.losing.length) r.losing.forEach((o) => bullet(`${o.niche_label} — ${o.market_city}, ${o.market_state} (${o.verdict ?? o.stage})`));
  else none();

  section("TOP MARKET OPPORTUNITIES");
  if (r.topOpportunities.length)
    r.topOpportunities.slice(0, 5).forEach((o) =>
      bullet(
        `${o.niche_label} — ${o.market_city}, ${o.market_state}: ${o.score_overall}/100 (${o.confidence_label ?? "?"} confidence) → ${o.verdict ?? "?"}`,
      ),
    );
  else none();

  section("LEAD PERFORMANCE (by market)");
  if (r.leadsByMarket.length) r.leadsByMarket.slice(0, 8).forEach((m) => bullet(`${m.identifier}: ${m.leads} leads`));
  else none();

  section("EXPERIMENT RESULTS");
  if (r.experiments.length)
    r.experiments.forEach((e) => bullet(`${e.hypothesis} — ${e.status}, ${e.leads} leads, gross ${dollars(e.grossProfit)}`));
  else none();

  section("RECOMMENDED ACTIONS");
  if (r.recommendedActions.length)
    r.recommendedActions.forEach((a, i) => lines.push(`${i + 1}. [${a.priority}] ${a.type} → ${a.target}: ${a.reason}`));
  else none();

  section("APPROVALS NEEDED");
  if (r.approvalsNeeded.length) r.approvalsNeeded.forEach((a) => bullet(`${a.type} → ${a.target} (awaiting James approval)`));
  else none();

  section("INTEGRATIONS / DATA COVERAGE");
  r.integrations.forEach((i) => bullet(`${i.source}: ${i.available ? "connected" : "NOT connected"} — ${i.reason}`));

  return lines.join("\n");
}
