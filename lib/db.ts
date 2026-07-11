import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "leads.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WAL mode allows the backup API to run concurrently with the app without locking errors.
db.pragma('journal_mode = WAL');

db.exec(`
  -- ─── Lead intake ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS leads (
    id            TEXT PRIMARY KEY,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    service       TEXT NOT NULL,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT NOT NULL,
    address       TEXT NOT NULL,
    zip           TEXT,
    details       TEXT,
    photos        TEXT,
    estimate_low  INTEGER,
    estimate_high INTEGER,
    status        TEXT NOT NULL DEFAULT 'new'
  );

  -- ─── Lead source attribution ───────────────────────────────────────────────
  -- Named sources (Facebook Ads, Google Organic, Nextdoor, etc.)
  -- channel: 'social' | 'search' | 'referral' | 'direct' | 'other'
  CREATE TABLE IF NOT EXISTS lead_sources (
    id         TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name       TEXT NOT NULL UNIQUE,
    channel    TEXT NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1
  );

  -- ─── Contractors ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS contractors (
    id                 TEXT PRIMARY KEY,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    name               TEXT NOT NULL,
    phone              TEXT NOT NULL,
    email              TEXT,
    active             INTEGER NOT NULL DEFAULT 1,
    priority_rank      INTEGER NOT NULL DEFAULT 100,
    rating             REAL,
    quotes_from_photos INTEGER NOT NULL DEFAULT 0,
    minimum_job_value  INTEGER NOT NULL DEFAULT 0
  );

  -- ─── Contractor service + zip coverage ───────────────────────────────────
  -- One row per (contractor, service, zip) — no coverage = no offers
  CREATE TABLE IF NOT EXISTS contractor_services (
    contractor_id TEXT NOT NULL REFERENCES contractors(id),
    service       TEXT NOT NULL,
    coverage_zip  TEXT NOT NULL,
    PRIMARY KEY (contractor_id, service, coverage_zip)
  );

  -- ─── Pre-routing qualification ────────────────────────────────────────────
  -- One opportunity per lead. Score (0-100) is rule-based, not AI.
  -- stage: 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  CREATE TABLE IF NOT EXISTS opportunities (
    id                   TEXT PRIMARY KEY,
    lead_id              TEXT NOT NULL REFERENCES leads(id),
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    title                TEXT NOT NULL,
    stage                TEXT NOT NULL DEFAULT 'qualified',
    opportunity_score    INTEGER NOT NULL DEFAULT 0,
    estimated_value      INTEGER,
    probability          INTEGER,
    expected_close_date  TEXT,
    assigned_to          TEXT,
    notes                TEXT,
    won_at               TEXT,
    lost_at              TEXT,
    lost_reason          TEXT
  );

  -- ─── First-to-accept routing ──────────────────────────────────────────────
  -- A lead may generate multiple assignment rows (one offer per contractor).
  -- The first accepted row locks the lead; remaining offers should be expired.
  -- status: 'offered' | 'accepted' | 'declined' | 'expired'
  CREATE TABLE IF NOT EXISTS assignments (
    id            TEXT PRIMARY KEY,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    lead_id       TEXT NOT NULL REFERENCES leads(id),
    contractor_id TEXT NOT NULL REFERENCES contractors(id),
    status        TEXT NOT NULL DEFAULT 'offered',
    offered_at    TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at  TEXT,
    accepted_at   TEXT,
    quote_amount  INTEGER,
    margin_amount INTEGER
  );

  -- ─── Project lifecycle + margin ───────────────────────────────────────────
  -- Created when an assignment is accepted. Tracks on-site execution.
  -- status: 'contracted' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  CREATE TABLE IF NOT EXISTS projects (
    id                TEXT PRIMARY KEY,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    lead_id           TEXT NOT NULL REFERENCES leads(id),
    contractor_id     TEXT NOT NULL REFERENCES contractors(id),
    status            TEXT NOT NULL DEFAULT 'contracted',
    actual_revenue    INTEGER,
    contractor_payout INTEGER,
    started_at        TEXT,
    completed_at      TEXT,
    latitude          REAL,
    longitude         REAL
  );

  -- ─── Communications log ───────────────────────────────────────────────────
  -- Every touchpoint with a lead: calls, emails, SMS, internal notes.
  -- type: 'email' | 'call' | 'sms' | 'note' | 'meeting'
  -- direction: 'inbound' | 'outbound'
  -- status: 'sent' | 'received' | 'scheduled' | 'failed'
  CREATE TABLE IF NOT EXISTS communications (
    id               TEXT PRIMARY KEY,
    lead_id          TEXT NOT NULL REFERENCES leads(id),
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    type             TEXT NOT NULL,
    direction        TEXT NOT NULL,
    subject          TEXT,
    body             TEXT,
    duration_seconds INTEGER,
    status           TEXT NOT NULL DEFAULT 'sent',
    sent_by          TEXT,
    external_id      TEXT
  );

  -- ─── Document storage ─────────────────────────────────────────────────────
  -- Local file storage under data/documents/. Linked to a lead or project.
  -- type: 'contract' | 'proposal' | 'invoice' | 'photo' | 'permit' | 'other'
  -- status: 'draft' | 'sent' | 'signed' | 'approved' | 'rejected'
  CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    lead_id     TEXT REFERENCES leads(id),
    project_id  TEXT REFERENCES projects(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    file_size   INTEGER,
    mime_type   TEXT,
    status      TEXT NOT NULL DEFAULT 'draft',
    uploaded_by TEXT,
    notes       TEXT
  );

  -- ─── Notifications ────────────────────────────────────────────────────────
  -- One row per dispatch attempt. Multi-channel: each channel gets its own row.
  -- type: 'new_lead' | 'status_change' | 'follow_up_due' | 'job_scheduled' | 'system'
  -- channel: 'in_app' | 'discord' | 'sms' | 'email'
  -- status: 'pending' | 'sent' | 'failed'
  -- read_at: NULL = unread (meaningful for in_app only)
  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    type       TEXT NOT NULL,
    channel    TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    lead_id    TEXT REFERENCES leads(id),
    project_id TEXT REFERENCES projects(id),
    priority   TEXT NOT NULL DEFAULT 'medium',
    status     TEXT NOT NULL DEFAULT 'pending',
    read_at    TEXT,
    sent_at    TEXT,
    action_url TEXT,
    error      TEXT
  );

  -- ─── Permit intelligence (Phase 2) ────────────────────────────────────────
  -- permit_sources: registered public permit data feeds by county/city
  CREATE TABLE IF NOT EXISTS permit_sources (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    url             TEXT,
    county          TEXT NOT NULL,
    last_fetched_at TEXT
  );

  -- permits: individual permit records, may be auto-matched to a lead via zip
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

  -- project_permits: links a booked project to associated permits
  CREATE TABLE IF NOT EXISTS project_permits (
    project_id TEXT NOT NULL REFERENCES projects(id),
    permit_id  TEXT NOT NULL REFERENCES permits(id),
    PRIMARY KEY (project_id, permit_id)
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
`);

// Idempotent column migrations — catch duplicate-column errors from concurrent workers
function addColumn(table: string, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err: unknown) {
    if (!(err instanceof Error) || !err.message.includes('duplicate column name')) {
      throw err;
    }
  }
}

// leads — zip and source attribution (pre-existing installs may be missing these)
addColumn("leads", "zip", "TEXT");
addColumn("leads", "source_id", "TEXT REFERENCES lead_sources(id)");
addColumn("leads", "utm_source", "TEXT");
addColumn("leads", "utm_medium", "TEXT");
addColumn("leads", "utm_campaign", "TEXT");
addColumn("leads", "utm_content", "TEXT");
addColumn("leads", "utm_term", "TEXT");
addColumn("leads", "referrer_url", "TEXT");
addColumn("leads", "referral_lead_id", "TEXT REFERENCES leads(id)");

// contractors — minimum_job_value (pre-existing installs won't have this)
addColumn("contractors", "minimum_job_value", "INTEGER NOT NULL DEFAULT 0");

// projects — lat/lng for geocoded job site
addColumn("projects", "latitude", "REAL");
addColumn("projects", "longitude", "REAL");

// pending_posts — image_path (pre-existing installs may be missing this)
addColumn("pending_posts", "image_path", "TEXT");

// leads — CRM follow-up fields
addColumn("leads", "last_contacted_at", "TEXT");
addColumn("leads", "next_followup_at", "TEXT");
addColumn("leads", "followup_count", "INTEGER NOT NULL DEFAULT 0");
addColumn("leads", "notes", "TEXT");
addColumn("leads", "review_send_at", "TEXT");

// communications — error details for failed sends
addColumn("communications", "error", "TEXT");

export default db;
