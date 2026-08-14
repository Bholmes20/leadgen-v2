# P1C — External SEO + Opportunity Research Intelligence

P1C gives the intelligence system its first **real external** capabilities:

- **A. Augusta SEO intelligence** — a real Google Search Console client + incremental
  ingestion + baseline/comparison analytics + deterministic SEO signals →
  PROPOSED recommendations.
- **B. Opportunity research intelligence** — a reusable CITY × NICHE research
  pipeline (task lifecycle + provenance-first evidence + freshness), Scoring V2
  (score vs. evidence-confidence kept separate), and Opportunity Report #1.

P1C is an **intelligence** phase: READ / RESEARCH / SCORE / COMPARE / RECOMMEND /
REPORT only. It never launches markets, publishes pages, spends money, or edits
production content. All such actions remain approval-gated.

## Files

| Area | File |
| --- | --- |
| GSC client (zero-dep) | `lib/intel/growth/gscClient.ts` |
| Adapter wiring | `lib/intel/growth/adapters.ts` |
| Ingestion (incremental/backfill/range) | `lib/intel/growth/searchConsole.ts` |
| SEO analytics + comparison windows | `lib/intel/growth/seoAnalytics.ts` |
| SEO signals | `lib/intel/growth/seoSignals.ts` |
| Signal→recommendation map | `lib/intel/growth/signals.ts` |
| Research pipeline | `lib/intel/research.ts` |
| Evidence freshness | `lib/intel/freshness.ts` |
| Scoring V2 | `lib/intel/scoringV2.ts` |
| Opportunity Report | `lib/intel/opportunityReport.ts` |
| Worker surface | `lib/intel/worker.ts` |
| Schema (additive) | `lib/intel/schema.ts` → `intel_research_tasks` |
| Dashboard | `app/admin/intelligence/page.tsx` |

## Data reality (as of P1C)

- **Search Console: NOT_CONNECTED** (`GSC_SITE_URL` / `GOOGLE_SERVICE_ACCOUNT_JSON`
  unset). The real client is implemented and inert. See `gsc-setup.md`.
- **No research evidence yet** → Opportunity Report #1 is **RESEARCH_INCOMPLETE**
  by design (a progress view, not a fake ranking). Seeds are seeds, not winners —
  nothing is scored highly without real evidence.

## SEO signals (deterministic, threshold-based)

Thresholds live in `SEO_SIGNAL_THRESHOLDS` (never in a prompt). Suppressed (not
faked) when GSC is absent. Types: `HIGH_IMPRESSIONS_LOW_CTR`,
`PAGE_WITH_IMPRESSIONS_NO_CLICKS`, `PAGE_WITH_CLICKS_NO_LEADS`,
`COMMERCIAL_QUERY_POSITION_5_15`, `QUERY_POSITION_NEAR_PAGE_ONE`,
`QUERY_POSITION_NEAR_TOP_THREE`, `PAGE_GAINING/LOSING_VISIBILITY`,
`QUERY_GAINING_VISIBILITY`, `CTR_DECLINING`, `POSITION_IMPROVING/DECLINING`,
`PAGE_WITH_LEADS_AND_GROWING_VISIBILITY`, `INSUFFICIENT_DATA`. Comparison signals
require the min-data thresholds so tiny samples never fire.

## Comparison windows

`comparePeriods('page'|'query', days)` compares the latest N days vs the previous
N days (e.g. 7v7, 28v28), impression-weighted, with explicit minimum-data gates.

## Research pipeline

`createResearchTask(market×niche)` → `recordResearchEvidence(...)` (applies the
freshness policy) → `completeResearchDimension(...)` per the six dimensions →
auto re-score on completion. Raw observations stay in `intel_evidence`; the task
tracks status/progress/blockers. Lifecycle: `QUEUED → IN_PROGRESS → (BLOCKED) →
COMPLETE`, plus `STALE`.

## Scoring V2

`analyzeOpportunity(id)` returns the deterministic score **and**, separately, the
evidence confidence, plus per-dimension coverage / stale / missing factors and a
`researchComplete` flag. Opportunity Score ≠ probability of success.

## Opportunity Report #1

`generateOpportunityReport()` ranks only when ≥ `minReadyForRanking` (default 15)
opportunities have complete, confident research; otherwise **RESEARCH_INCOMPLETE**
with a per-candidate progress + missing-evidence view. When ready: top 5 + one
non-baseline challenger to validate beside Augusta.

## Activity / Slack

New events: `GSC_INGESTION_STARTED/COMPLETED/FAILED`, `SEO_SIGNAL_DETECTED`,
`SEO_RECOMMENDATION_CREATED`, `RESEARCH_TASK_CREATED/STARTED`,
`RESEARCH_DIMENSION_COMPLETED`, `RESEARCH_COMPLETED`, `OPPORTUNITY_RESCORED`,
`OPPORTUNITY_RANK_CHANGED`, `REPORT_GENERATED`. Facts only — no hidden reasoning.
Feeds the existing Slack contract (`slack-event-contract.md`).

## Not built yet (deliberate)

Scheduled growth cron (automation comes **after** trustworthy intelligence), GA4 /
Google Ads server APIs, and any autonomous action. Approval boundaries unchanged.
