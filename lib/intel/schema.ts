// Additive schema for the Opportunity + Growth Intelligence layer.
//
// SAFETY: this is CREATE TABLE IF NOT EXISTS only, on a dedicated `intel_*`
// namespace. It never alters or touches existing tables (leads, opportunities,
// contractors, …). Rollback is a clean `DROP TABLE intel_*`. It is invoked once
// from lib/db.ts AFTER the main schema, receiving the same Database handle, so
// there is no circular import and no second connection.

import type Database from "better-sqlite3";

export function ensureIntelSchema(db: Database.Database): void {
  db.exec(`
    -- ─── Research universe: markets ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS intel_markets (
      id            TEXT PRIMARY KEY,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      city          TEXT NOT NULL,
      state         TEXT NOT NULL,             -- free text (not the GA|SC union)
      metro         TEXT,
      county        TEXT,
      population    INTEGER,
      context       TEXT,
      seo_city_slug TEXT,                       -- links to lib/seo CITIES when live
      is_seed       INTEGER NOT NULL DEFAULT 0,
      UNIQUE (city, state)
    );

    -- ─── Research universe: niches ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS intel_niches (
      id              TEXT PRIMARY KEY,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      slug            TEXT NOT NULL UNIQUE,
      label           TEXT NOT NULL,
      lead_service    TEXT,                     -- links to CRM leads.service
      seasonality     TEXT,
      ticket_band_low  INTEGER,
      ticket_band_high INTEGER,
      margin_band_low  INTEGER,
      margin_band_high INTEGER,
      recurring_b2b   INTEGER NOT NULL DEFAULT 0,
      notes           TEXT,
      is_seed         INTEGER NOT NULL DEFAULT 0
    );

    -- ─── Market × niche opportunities ───────────────────────────────────────
    -- One row per (market, niche). Scores are a DENORMALIZED snapshot of the
    -- latest scoring run; the ground truth is always intel_evidence, so a score
    -- can be re-derived and explained at any time.
    CREATE TABLE IF NOT EXISTS intel_opportunities (
      id               TEXT PRIMARY KEY,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
      market_id        TEXT NOT NULL REFERENCES intel_markets(id),
      niche_id         TEXT NOT NULL REFERENCES intel_niches(id),
      stage            TEXT NOT NULL DEFAULT 'DISCOVERED',
      score_overall    INTEGER,
      score_components TEXT,                     -- JSON Record<component, number>
      score_reasons    TEXT,                     -- JSON string[]
      confidence       INTEGER,
      confidence_label TEXT,
      verdict          TEXT,
      scored_at        TEXT,
      notes            TEXT,
      UNIQUE (market_id, niche_id)
    );

    -- ─── Evidence ledger (append-only, provenance-first) ────────────────────
    -- kind ∈ FACT | ESTIMATE | INFERENCE | UNKNOWN — the guardrail against
    -- invented values masquerading as measured data.
    CREATE TABLE IF NOT EXISTS intel_evidence (
      id             TEXT PRIMARY KEY,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      opportunity_id TEXT REFERENCES intel_opportunities(id),
      market_id      TEXT REFERENCES intel_markets(id),
      niche_id       TEXT REFERENCES intel_niches(id),
      factor_key     TEXT NOT NULL,
      value_num      REAL,
      value_text     TEXT,
      kind           TEXT NOT NULL DEFAULT 'UNKNOWN',
      confidence     INTEGER,
      unit           TEXT,
      source_url     TEXT,
      observed_at    TEXT NOT NULL DEFAULT (datetime('now')),
      fresh_until    TEXT,
      author         TEXT,
      notes          TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_intel_evidence_opp
      ON intel_evidence (opportunity_id, factor_key, observed_at);

    -- ─── Competitors (per opportunity) ──────────────────────────────────────
    CREATE TABLE IF NOT EXISTS intel_competitors (
      id             TEXT PRIMARY KEY,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      opportunity_id TEXT NOT NULL REFERENCES intel_opportunities(id),
      name           TEXT NOT NULL,
      website        TEXT,
      review_count   INTEGER,
      rating         REAL,
      domain_notes   TEXT,
      serp_position  INTEGER,
      maps_position  INTEGER,
      quality_score  INTEGER,
      observed_at    TEXT NOT NULL DEFAULT (datetime('now')),
      source_url     TEXT
    );

    -- ─── Experiments (validate an opportunity before scaling) ───────────────
    CREATE TABLE IF NOT EXISTS intel_experiments (
      id             TEXT PRIMARY KEY,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      opportunity_id TEXT NOT NULL REFERENCES intel_opportunities(id),
      hypothesis     TEXT NOT NULL,
      channel        TEXT NOT NULL,
      test_budget    INTEGER,                    -- cents
      start_date     TEXT,
      end_date       TEXT,
      landing_pages  TEXT,                        -- JSON string[]
      status         TEXT NOT NULL DEFAULT 'PLANNED',
      outcome        TEXT,
      lessons        TEXT
    );

    -- ─── Experiment metrics (time-series, one row per as_of × source) ───────
    CREATE TABLE IF NOT EXISTS intel_experiment_metrics (
      id              TEXT PRIMARY KEY,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      experiment_id   TEXT NOT NULL REFERENCES intel_experiments(id),
      as_of           TEXT NOT NULL,
      source          TEXT NOT NULL,
      impressions     INTEGER,
      clicks          INTEGER,
      sessions        INTEGER,
      calls           INTEGER,
      forms           INTEGER,
      qualified_leads INTEGER,
      quotes          INTEGER,
      booked_jobs     INTEGER,
      revenue         INTEGER,                    -- cents
      contractor_cost INTEGER,                    -- cents
      ad_spend        INTEGER                     -- cents
    );

    -- ─── Recommendation queue (the future worker's operating queue) ─────────
    CREATE TABLE IF NOT EXISTS intel_recommendations (
      id              TEXT PRIMARY KEY,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      type            TEXT NOT NULL,
      target          TEXT NOT NULL,
      reason          TEXT NOT NULL,
      evidence        TEXT,                        -- JSON
      expected_impact TEXT,
      confidence      INTEGER,
      priority        TEXT NOT NULL DEFAULT 'medium',
      effort          TEXT,
      est_cost        INTEGER,                     -- cents
      status          TEXT NOT NULL DEFAULT 'PROPOSED',
      reviewed_at     TEXT,
      approved_by     TEXT,
      outcome         TEXT,
      -- Dedup key so re-running the generator doesn't pile up duplicates.
      dedup_key       TEXT UNIQUE
    );

    -- ─── Decision audit log (approval boundary + report source) ─────────────
    CREATE TABLE IF NOT EXISTS intel_decisions (
      id               TEXT PRIMARY KEY,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      actor            TEXT NOT NULL,
      subject_type     TEXT NOT NULL,
      subject_id       TEXT NOT NULL,
      action           TEXT NOT NULL,
      from_state       TEXT,
      to_state         TEXT,
      permission_level TEXT NOT NULL,
      rationale        TEXT
    );

    -- ─── Growth-engine performance snapshots ────────────────────────────────
    -- Populated ONLY when a real adapter (GSC/GA4/Ads/leads) is available.
    -- Never seeded with fake data — an empty table means "not integrated yet".
    CREATE TABLE IF NOT EXISTS intel_performance (
      id          TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      scope       TEXT NOT NULL,
      identifier  TEXT NOT NULL,
      source      TEXT NOT NULL,
      as_of       TEXT NOT NULL,
      impressions INTEGER,
      clicks      INTEGER,
      ctr         REAL,
      position    REAL,
      sessions    INTEGER,
      conversions INTEGER,
      cost        INTEGER                          -- cents
    );
    CREATE INDEX IF NOT EXISTS idx_intel_performance_scope
      ON intel_performance (scope, identifier, source, as_of);

    -- ─── Activity / event audit layer (P1B) ─────────────────────────────────
    -- A durable, generic operational event stream. Meant to be consumed later by
    -- the company-level Alfred/James Slack command center — NOT a Lead-Gen Slack
    -- bot. Records operational FACTS and concise explanations only; never private
    -- chain-of-thought or hidden reasoning.
    CREATE TABLE IF NOT EXISTS intel_activity_events (
      id                TEXT PRIMARY KEY,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      event_type        TEXT NOT NULL,                       -- e.g. SIGNAL_DETECTED
      actor_type        TEXT NOT NULL DEFAULT 'system',      -- system | worker | human
      actor_name        TEXT,                                -- worker id / person / 'growth-engine'
      system            TEXT NOT NULL DEFAULT 'growth-intelligence',
      target_type       TEXT,                                -- opportunity | recommendation | page | market | signal | ingestion
      target_id         TEXT,
      market_id         TEXT,
      niche_id          TEXT,
      opportunity_id    TEXT,
      recommendation_id TEXT,
      experiment_id     TEXT,
      signal_id         TEXT,
      title             TEXT NOT NULL,                       -- one-line, Slack-renderable
      summary           TEXT,                                -- concise explanation (facts only)
      metadata          TEXT,                                -- JSON structured payload
      severity          TEXT NOT NULL DEFAULT 'info',        -- info | notice | warning | critical
      correlation_id    TEXT                                 -- task/run id to group related events
    );
    CREATE INDEX IF NOT EXISTS idx_intel_activity_created
      ON intel_activity_events (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_intel_activity_target
      ON intel_activity_events (target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_intel_activity_market
      ON intel_activity_events (market_id);

    -- ─── Deterministic growth signals (P1B) ─────────────────────────────────
    -- A signal is a threshold-crossing observation, NOT an action. Every signal
    -- records the measured values and the exact threshold that produced it, so it
    -- is fully explainable. Signals are only created when the required data
    -- actually exists; otherwise an INSUFFICIENT_DATA signal (or nothing) is used.
    CREATE TABLE IF NOT EXISTS intel_signals (
      id                        TEXT PRIMARY KEY,
      created_at                TEXT NOT NULL DEFAULT (datetime('now')),
      signal_type               TEXT NOT NULL,               -- HIGH_IMPRESSIONS_LOW_CTR, …
      scope                     TEXT NOT NULL,               -- page | market | niche | attribution | system
      target                    TEXT NOT NULL,               -- identifier (page slug, market slug, …)
      market_id                 TEXT,
      niche_id                  TEXT,
      severity                  TEXT NOT NULL DEFAULT 'info',
      confidence                INTEGER,                     -- 0-100
      data_quality              TEXT NOT NULL DEFAULT 'MEASURED', -- MEASURED | DERIVED | ESTIMATED | UNKNOWN
      period_start              TEXT,
      period_end                TEXT,
      comparison_period_start   TEXT,
      comparison_period_end     TEXT,
      measured                  TEXT,                        -- JSON: the observed values
      threshold                 TEXT,                        -- JSON: the threshold(s) applied
      evidence                  TEXT,                        -- JSON: supporting context
      status                    TEXT NOT NULL DEFAULT 'OPEN',-- OPEN | ACKNOWLEDGED | RESOLVED
      dedup_key                 TEXT UNIQUE                  -- stable identity so re-eval upserts
    );
    CREATE INDEX IF NOT EXISTS idx_intel_signals_type
      ON intel_signals (signal_type, target);

    -- ─── Search Console dimensional store (P1B — incremental ingestion) ──────
    -- Empty until GSC is authenticated. NEVER seeded with fake data. Designed for
    -- incremental ingestion: one row per (property, date, page, query, country,
    -- device). Provenance = source + property + fetched_at.
    CREATE TABLE IF NOT EXISTS intel_search_metrics (
      id           TEXT PRIMARY KEY,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      source       TEXT NOT NULL DEFAULT 'gsc',
      property     TEXT NOT NULL,                            -- site identifier (e.g. sc-domain:… or URL)
      date         TEXT NOT NULL,                            -- YYYY-MM-DD
      page         TEXT,
      query        TEXT,
      country      TEXT,
      device       TEXT,
      clicks       INTEGER,
      impressions  INTEGER,
      ctr          REAL,
      position     REAL,
      fetched_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (property, date, page, query, country, device)
    );
    CREATE INDEX IF NOT EXISTS idx_intel_search_metrics_prop_date
      ON intel_search_metrics (property, date);
    CREATE INDEX IF NOT EXISTS idx_intel_search_metrics_page
      ON intel_search_metrics (page, date);

    -- ─── Ingestion cursor (incremental design, provenance) ──────────────────
    CREATE TABLE IF NOT EXISTS intel_ingestion_state (
      id                 TEXT PRIMARY KEY,
      source             TEXT NOT NULL,                      -- gsc | ga4 | google_ads
      property           TEXT NOT NULL,
      last_ingested_date TEXT,                               -- high-water mark for incremental pulls
      last_run_at        TEXT,
      last_status        TEXT,                               -- SUCCESS | FAILED | NOT_CONNECTED
      last_error         TEXT,
      rows_ingested      INTEGER NOT NULL DEFAULT 0,
      UNIQUE (source, property)
    );
  `);
}
