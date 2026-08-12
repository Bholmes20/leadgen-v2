# P1B — Real Growth Intelligence + Activity Foundation

P1B connects the P1A intelligence structure to **real operating data** and adds a
durable activity/event layer. It answers: where are we winning, where are we
losing, what should we improve, where should we test next, and what is the system
currently doing — using only data we actually have.

**No fake data.** Where the schema or an integration can't produce a metric, it is
reported explicitly as `UNKNOWN` / `UNAVAILABLE` / `NOT_CONNECTED`. Every derived
number is tagged `MEASURED | DERIVED | ESTIMATED | UNKNOWN`.

## What's new (files)

| Area | File |
| --- | --- |
| Schema (additive) | `lib/intel/schema.ts` — `intel_activity_events`, `intel_signals`, `intel_search_metrics`, `intel_ingestion_state` |
| Types | `lib/intel/types.ts` — activity/signal/data-quality/connection enums + row shapes |
| Mapping | `lib/intel/mapping.ts` — lead ↔ page ↔ market ↔ niche across the two registries |
| Lead performance | `lib/intel/growth/performance.ts` — `getLeadPerformance(filter)` |
| Page performance | `lib/intel/growth/pageModel.ts` — `buildPagePerformance()` |
| GSC boundary | `lib/intel/growth/adapters.ts` — `SearchConsoleAdapter` |
| GSC ingestion | `lib/intel/growth/searchConsole.ts` — incremental `ingestSearchConsole()` |
| Signals | `lib/intel/growth/signals.ts` — deterministic signals + signal→recommendation |
| Activity | `lib/intel/activity.ts` — record + query the event stream |
| Status | `lib/intel/status.ts` — `getSystemStatus()` |
| Worker facade | `lib/intel/worker.ts` — read + RECOMMEND-level surface |
| Dashboard | `app/admin/intelligence/page.tsx` — new read-only sections |

## Data reality (as of P1B)

- **Available:** the real `leads` table (status, attribution, timestamps).
- **NOT_CONNECTED:** Google Search Console, GA4 Data API, Google Ads API (adapter
  stubs; server-side ingestion not wired). Client-side gtag conversion tracking is
  separate and unaffected.
- **UNAVAILABLE:** revenue / job economics — the `projects` table has no completed
  jobs with `actual_revenue`.

Because production currently holds only a handful of test leads with mostly-NULL
attribution, most computed metrics are honestly `0` / `UNKNOWN` today. The
machinery is correct and lights up automatically as real attributed leads arrive.

## Mapping strategy

- `intel_markets.seo_city_slug` ↔ `lib/seo` city slug (exact) ↔ `leads.city`.
- `intel_niches.slug` ↔ `lib/seo` niche slug **only where identical**; other niches
  stay attributed at the SEO-slug level and are flagged **UNMAPPED** (never forced).
- `leads.source_page` → `lib/seo` published page/hub (leading slash normalized).
- NULL attribution → `(unattributed)` bucket → `UNMAPPED_LEAD_ATTRIBUTION` signal.

## Connecting Search Console later (Step 4)

The adapter boundary is complete and reports `NOT_CONNECTED` until:

1. `GSC_SITE_URL` — the verified property (e.g. `sc-domain:eseeent.com`).
2. `GOOGLE_SERVICE_ACCOUNT_JSON` — a service account with GSC read access, added as
   a user on the property.

Then implement the real client inside `searchConsoleAdapter.fetchSearchAnalytics()`.
`ingestSearchConsole()` already handles **incremental** ingestion: it reads the
`intel_ingestion_state` cursor, pulls only the new date window, and upserts rows
into `intel_search_metrics` (idempotent on `property,date,page,query,country,device`)
with provenance (`source`, `property`, `fetched_at`). Credentials are never logged.

## Signals & thresholds (Step 5/6)

Thresholds live in `GROWTH_SIGNAL_THRESHOLDS` (plain config, not in any prompt).
Signals that need GSC/GA4 are **suppressed** and reported in `skipped`, never faked.
Available today from leads alone: `INSUFFICIENT_DATA`, `UNMAPPED_LEAD_ATTRIBUTION`,
`HIGH_LEAD_VOLUME_POOR_OUTCOME`. Signals map to PROPOSED recommendations via
`generateRecommendationsFromSignals()` (deduplicated; nothing executed).

## Worker surface (Step 10)

`lib/intel/worker.ts` exposes read + RECOMMEND-level methods only
(`getSystemStatusForWorker`, `getMarketPerformance`, `getPagePerformance`,
`getGrowthSignals`, `getRecommendations`, `getRecentActivity`, `getTopOpportunities`,
`getOpportunityEvidence`, `generateGrowthRecommendations`). Approval-required
mutations stay behind the permission layer and are intentionally not on this surface.

## Slack

See [`slack-event-contract.md`](./slack-event-contract.md). P1B ships the data;
Slack itself is deferred.

## Safety

Additive migrations only (`CREATE TABLE IF NOT EXISTS`), same `intel_*` namespace,
no changes to existing tables. Rollback = `DROP TABLE intel_*`. Tests and local
build use a temp DB via `LEADS_DB_PATH`; production `data/leads.db` is never
touched by this work.
