import "./_setup";
import db from "../../lib/db";
import test from "node:test";
import assert from "node:assert/strict";
import { ga4Adapter, ingestGa4, upsertGa4Snapshots, getGa4IngestionState } from "../../lib/intel";

const PROP = "123456789";

test("GA4 credential/property absence: adapter reports NOT_CONNECTED and never fabricates", async () => {
  assert.equal(ga4Adapter.isAvailable(), false);
  assert.equal(ga4Adapter.connectionState(), "NOT_CONNECTED");
  const rows = await ga4Adapter.fetchPageMetrics({ startDate: "2026-08-01", endDate: "2026-08-07" });
  assert.deepEqual(rows, []);
});

test("ingestGa4 is a clean NOT_CONNECTED no-op", async () => {
  const r = await ingestGa4({ now: "2026-08-21T00:00:00.000Z" });
  assert.equal(r.status, "NOT_CONNECTED");
  assert.equal(r.rowsIngested, 0);
});

test("ga4Adapter.property() normalizes 'properties/123' and bare ids, rejects junk", () => {
  const prev = process.env.GA4_PROPERTY_ID;
  try {
    process.env.GA4_PROPERTY_ID = "properties/123456789";
    assert.equal(ga4Adapter.property(), "123456789");
    process.env.GA4_PROPERTY_ID = "  987654321 ";
    assert.equal(ga4Adapter.property(), "987654321");
    process.env.GA4_PROPERTY_ID = "G-ABC123"; // measurement id, not a property id
    assert.equal(ga4Adapter.property(), null);
  } finally {
    if (prev === undefined) delete process.env.GA4_PROPERTY_ID;
    else process.env.GA4_PROPERTY_ID = prev;
  }
});

test("upsertGa4Snapshots is idempotent on (scope, identifier, source, as_of)", () => {
  upsertGa4Snapshots(PROP, [{ pagePath: "/junk-removal-augusta-ga", sessions: 10 }], "2026-08-20");
  upsertGa4Snapshots(PROP, [{ pagePath: "/junk-removal-augusta-ga", sessions: 10 }], "2026-08-20"); // same key → update

  const count = (
    db.prepare("SELECT COUNT(*) AS n FROM intel_performance WHERE source = 'ga4'").get() as { n: number }
  ).n;
  assert.equal(count, 1);

  upsertGa4Snapshots(PROP, [{ pagePath: "/junk-removal-augusta-ga", sessions: 42 }], "2026-08-20");
  const stored = db
    .prepare("SELECT sessions FROM intel_performance WHERE source = 'ga4'")
    .get() as { sessions: number };
  assert.equal(stored.sessions, 42); // updated in place

  const still = (
    db.prepare("SELECT COUNT(*) AS n FROM intel_performance WHERE source = 'ga4'").get() as { n: number }
  ).n;
  assert.equal(still, 1);
});

test("upsertGa4Snapshots skips unresolvable/root paths (never fabricates an id)", () => {
  const before = (
    db.prepare("SELECT COUNT(*) AS n FROM intel_performance WHERE source = 'ga4'").get() as { n: number }
  ).n;
  const written = upsertGa4Snapshots(PROP, [{ pagePath: "/", sessions: 5 }, { pagePath: null, sessions: 9 }], "2026-08-19");
  assert.equal(written, 0);
  const after = (
    db.prepare("SELECT COUNT(*) AS n FROM intel_performance WHERE source = 'ga4'").get() as { n: number }
  ).n;
  assert.equal(after, before);
});

test("GA4 ingestion cursor is absent before any ingest", () => {
  assert.equal(getGa4IngestionState("999"), undefined);
});
