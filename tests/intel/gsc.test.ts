import "./_setup";
import db from "../../lib/db";
import test from "node:test";
import assert from "node:assert/strict";
import {
  searchConsoleAdapter,
  hasGscCredentials,
  loadServiceAccount,
  ingestSearchConsole,
  upsertSearchMetrics,
  getIngestionState,
} from "../../lib/intel";

const PROP = "sc-domain:test.example";

test("credential absence: adapter reports NOT_CONNECTED and never fabricates", async () => {
  assert.equal(hasGscCredentials(), false);
  assert.equal(loadServiceAccount(), null);
  assert.equal(searchConsoleAdapter.isAvailable(), false);
  assert.equal(searchConsoleAdapter.connectionState(), "NOT_CONNECTED");
  const rows = await searchConsoleAdapter.fetchSearchAnalytics({ startDate: "2026-08-01", endDate: "2026-08-07" });
  assert.deepEqual(rows, []);
});

test("ingestSearchConsole is a clean NOT_CONNECTED no-op", async () => {
  const r = await ingestSearchConsole({ now: "2026-08-12T00:00:00.000Z" });
  assert.equal(r.status, "NOT_CONNECTED");
  assert.equal(r.rowsIngested, 0);
});

test("loadServiceAccount parses inline and base64 JSON when present", () => {
  const json = JSON.stringify({ client_email: "svc@example.iam", private_key: "-----KEY-----" });
  const prev = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  try {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = json;
    assert.equal(loadServiceAccount()?.client_email, "svc@example.iam");
    assert.equal(hasGscCredentials(), true);

    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = Buffer.from(json, "utf8").toString("base64");
    assert.equal(loadServiceAccount()?.client_email, "svc@example.iam");
  } finally {
    if (prev === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = prev;
  }
});

test("upsertSearchMetrics is idempotent on (property,date,page,query,country,device)", () => {
  const row = { date: "2026-08-01", page: "/x", query: "q", clicks: 1, impressions: 10, ctr: 0.1, position: 5 };
  upsertSearchMetrics(PROP, [row], "2026-08-02T00:00:00.000Z");
  upsertSearchMetrics(PROP, [row], "2026-08-03T00:00:00.000Z"); // same key → update, not duplicate

  const count = (db.prepare("SELECT COUNT(*) AS n FROM intel_search_metrics WHERE property = ?").get(PROP) as { n: number }).n;
  assert.equal(count, 1);

  upsertSearchMetrics(PROP, [{ ...row, clicks: 7 }], "2026-08-04T00:00:00.000Z");
  const stored = db.prepare("SELECT clicks FROM intel_search_metrics WHERE property = ?").get(PROP) as { clicks: number };
  assert.equal(stored.clicks, 7); // updated in place

  const still = (db.prepare("SELECT COUNT(*) AS n FROM intel_search_metrics WHERE property = ?").get(PROP) as { n: number }).n;
  assert.equal(still, 1);
});

test("ingestion cursor persists via setIngestionState/getIngestionState round-trip", () => {
  // No cursor before any ingest for this property.
  assert.equal(getIngestionState("gsc", "sc-domain:none"), undefined);
});
