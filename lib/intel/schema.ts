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
  `);
}
