import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "leads.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  -- ─── Lead intake ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS leads (
    id           TEXT PRIMARY KEY,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    service      TEXT NOT NULL,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    address      TEXT NOT NULL,
    zip          TEXT,
    details      TEXT,
    photos       TEXT,
    estimate_low  INTEGER,
    estimate_high INTEGER,
    status       TEXT NOT NULL DEFAULT 'new'
  );

  -- ─── Social post queue ────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS pending_posts (
    id           TEXT PRIMARY KEY,
    service      TEXT NOT NULL,
    format       TEXT NOT NULL,
    tone         TEXT NOT NULL,
    headline     TEXT NOT NULL,
    body         TEXT NOT NULL,
    cta          TEXT NOT NULL,
    full_text    TEXT NOT NULL,
    content_hash TEXT NOT NULL UNIQUE,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at  TEXT,
    posted_at    TEXT,
    fb_post_id   TEXT,
    image_path   TEXT,
    error        TEXT
  );

  -- ─── Contractors ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS contractors (
    id                  TEXT PRIMARY KEY,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    name                TEXT NOT NULL,
    phone               TEXT NOT NULL,
    email               TEXT,
    active              INTEGER NOT NULL DEFAULT 1,
    priority_rank       INTEGER NOT NULL DEFAULT 100,
    rating              REAL,
    quotes_from_photos  INTEGER NOT NULL DEFAULT 0
  );

  -- ─── Contractor service + zip coverage ───────────────────────────────────
  -- One row per (contractor, service, zip) — no coverage = no offers
  CREATE TABLE IF NOT EXISTS contractor_services (
    contractor_id  TEXT NOT NULL REFERENCES contractors(id),
    service        TEXT NOT NULL,
    coverage_zip   TEXT NOT NULL,
    PRIMARY KEY (contractor_id, service, coverage_zip)
  );

  -- ─── First-to-accept routing ──────────────────────────────────────────────
  -- A lead may generate multiple assignment rows (one offer per contractor).
  -- The first accepted row locks the lead; remaining offers should be expired.
  CREATE TABLE IF NOT EXISTS assignments (
    id             TEXT PRIMARY KEY,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    lead_id        TEXT NOT NULL REFERENCES leads(id),
    contractor_id  TEXT NOT NULL REFERENCES contractors(id),
    status         TEXT NOT NULL DEFAULT 'offered',
    offered_at     TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at   TEXT,
    accepted_at    TEXT,
    quote_amount   INTEGER,
    margin_amount  INTEGER
  );

  -- ─── Project lifecycle + margin ───────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS projects (
    id                 TEXT PRIMARY KEY,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    lead_id            TEXT NOT NULL REFERENCES leads(id),
    contractor_id      TEXT NOT NULL REFERENCES contractors(id),
    status             TEXT NOT NULL DEFAULT 'contracted',
    actual_revenue     INTEGER,
    contractor_payout  INTEGER,
    started_at         TEXT,
    completed_at       TEXT
  );

  -- ─── Permit intelligence (Phase 2 — tables defined, ingestion deferred) ──
  CREATE TABLE IF NOT EXISTS permit_sources (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    url            TEXT,
    county         TEXT NOT NULL,
    last_fetched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS permits (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    source_id       TEXT REFERENCES permit_sources(id),
    permit_type     TEXT NOT NULL,
    address         TEXT NOT NULL,
    zip             TEXT NOT NULL,
    owner_name      TEXT,
    issued_date     TEXT,
    estimated_value INTEGER,
    raw_data        TEXT,
    lead_id         TEXT REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS project_permits (
    project_id  TEXT NOT NULL REFERENCES projects(id),
    permit_id   TEXT NOT NULL REFERENCES permits(id),
    PRIMARY KEY (project_id, permit_id)
  );
`);

// Idempotent column migrations for tables that existed before this schema version
const leadCols = (
  db.prepare("PRAGMA table_info(leads)").all() as Array<{ name: string }>
).map((r) => r.name);
if (!leadCols.includes("zip")) {
  db.exec("ALTER TABLE leads ADD COLUMN zip TEXT");
}

// pending_posts.image_path may be missing on older installs
const postCols = (
  db.prepare("PRAGMA table_info(pending_posts)").all() as Array<{ name: string }>
).map((r) => r.name);
if (!postCols.includes("image_path")) {
  db.exec("ALTER TABLE pending_posts ADD COLUMN image_path TEXT");
}

export default db;
