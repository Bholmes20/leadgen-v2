// Internal Pricing Guide v1 tests.
//
// Two jobs:
//   1. Lock the quoting math/matching in lib/pricing.ts so it can't silently drift.
//   2. Guard the hard rule that pricing is INTERNAL — never imported by, or rendered
//      on, a public (non-admin) page.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  suggestPricing,
  PRICING_BANDS,
  ACCESS_ADJUSTMENTS,
  formatBand,
  formatAdjustment,
} from "../../lib/pricing";

const ROOT = process.cwd();

// ── Matching / math ──────────────────────────────────────────────────────────

test("mattress curbside → two candidate bands, low-band range, no adjustments", () => {
  const s = suggestPricing({ itemType: "mattress-pickup", pickupLocation: "curbside" });
  assert.deepEqual(s.bands.map((b) => b.id), ["mattress-curbside", "mattress-boxspring-curbside"]);
  assert.deepEqual(s.range, { low: 75, high: 110, openEnded: false });
  assert.equal(s.adjustments.length, 0);
  assert.equal(s.simple, false, "two candidate bands is not a clean single match");
  assert.ok(s.notes.some((n) => /low end/i.test(n)), "curbside rationale prefers the low end");
});

test("inside-first-floor adds the inside adjustment to the range", () => {
  const s = suggestPricing({ itemType: "mattress-pickup", pickupLocation: "inside-first-floor" });
  assert.deepEqual(s.adjustments.map((a) => a.id), ["inside"]);
  // base mattress 75–110  + inside 25–75  →  100–185
  assert.deepEqual(s.range, { low: 100, high: 185, openEnded: false });
});

test("junk-removal upstairs + heavy → load bands with stacked adjustments", () => {
  const s = suggestPricing({
    itemType: "junk-removal",
    pickupLocation: "upstairs",
    heavyItems: true,
  });
  assert.deepEqual(s.bands.map((b) => b.id), ["small-load", "half-load", "full-load"]);
  assert.deepEqual(s.adjustments.map((a) => a.id), ["upstairs", "heavy"]);
  // primary small-load 150–300  + upstairs 50–150  + heavy 50–200  →  250–650
  assert.deepEqual(s.range, { low: 250, high: 650, openEnded: false });
  assert.ok(s.notes.some((n) => /bundle/i.test(n)), "warns to bundle multiple factors manually");
});

test("soiled wording in details adds the dirty/soiled adjustment", () => {
  const s = suggestPricing({
    itemType: "furniture-pickup",
    pickupLocation: "curbside",
    details: "Old couch, pet-stained and kind of soiled",
  });
  assert.ok(s.adjustments.some((a) => a.id === "soiled"), "detects soiled/pet-stained wording");
});

test("clean details do not trigger a soiled adjustment", () => {
  const s = suggestPricing({
    itemType: "furniture-pickup",
    pickupLocation: "curbside",
    details: "One couch in good shape by the garage",
  });
  assert.ok(!s.adjustments.some((a) => a.id === "soiled"));
});

test("rental cleanout is a single open-ended band and not a clean copy match", () => {
  const s = suggestPricing({ itemType: "rental-cleanout", pickupLocation: "whole-unit" });
  assert.deepEqual(s.bands.map((b) => b.id), ["rental-cleanout"]);
  assert.deepEqual(s.range, { low: 350, high: 1500, openEnded: true });
  assert.equal(s.simple, false, "open-ended scope job must be scoped, not one-click copied");
});

test("carpet removal and unknown types yield no band and a manual-quote note", () => {
  const carpet = suggestPricing({ itemType: "carpet-removal", pickupLocation: "curbside" });
  assert.deepEqual(carpet.bands, []);
  assert.equal(carpet.range, null);
  assert.ok(carpet.notes.some((n) => /carpet/i.test(n) && /manual|band/i.test(n)));

  const other = suggestPricing({ itemType: "other", pickupLocation: "garage" });
  assert.deepEqual(other.bands, []);
  assert.equal(other.range, null);
  assert.ok(other.notes.some((n) => /manual/i.test(n)));
});

test("formatting shows ranges, thousands separators, and the open-ended +", () => {
  assert.equal(formatBand({ low: 90, high: 140 }), "$90–$140");
  assert.equal(formatBand({ low: 500, high: 2000, openEnded: true }), "$500–$2,000+");
  assert.equal(formatAdjustment({ low: 25, high: 75 }), "+$25–$75");
});

test("every matched band id and adjustment id exists in the published tables", () => {
  const bandIds = new Set(PRICING_BANDS.map((b) => b.id));
  const adjIds = new Set(ACCESS_ADJUSTMENTS.map((a) => a.id));
  for (const itemType of [
    "mattress-pickup",
    "furniture-pickup",
    "bulk-item-pickup",
    "junk-removal",
    "rental-cleanout",
    "tenant-trash-out",
  ]) {
    const s = suggestPricing({ itemType, pickupLocation: "upstairs", heavyItems: true });
    for (const b of s.bands) assert.ok(bandIds.has(b.id), `band ${b.id} is published`);
    for (const a of s.adjustments) assert.ok(adjIds.has(a.id), `adjustment ${a.id} is published`);
  }
});

// ── Internal-only guards ───────────────────────────────────────────────────────

// Walk the app/components/lib trees, skipping admin + internal-only files, and collect
// every public (customer/SEO-facing) source file.
function publicSourceFiles(): string[] {
  const out: string[] = [];
  const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
  // Admin UI and outbound messaging are internal; the pricing module is the thing under test.
  const SKIP_PATHS = new Set([
    "app/admin",
    "lib/pricing.ts",
    "lib/email.ts",
    "lib/followup.ts",
  ]);
  function walk(relDir: string) {
    const abs = path.join(ROOT, relDir);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(relDir, entry.name);
      if (SKIP_PATHS.has(rel)) continue;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(rel);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        out.push(rel);
      }
    }
  }
  for (const dir of ["app", "components", "lib"]) walk(dir);
  return out;
}

test("no public (non-admin) source imports the internal pricing module", () => {
  const files = publicSourceFiles();
  assert.ok(files.length > 0, "sanity: found public source files to scan");
  for (const rel of files) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.ok(
      !/lib\/pricing/.test(text),
      `${rel} must not import the internal pricing module`,
    );
  }
});

test("the Suggested Pricing UI lives only under app/admin", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, "app/admin/leads/[id]/SuggestedPricing.tsx")),
    "pricing panel is an admin component",
  );
  assert.ok(
    !fs.existsSync(path.join(ROOT, "components/SuggestedPricing.tsx")),
    "pricing panel must not leak into the shared/public components dir",
  );
});

// ── Admin can render a suggestion ───────────────────────────────────────────────

test("admin lead detail wires the pricing suggestion into the page", () => {
  const page = fs.readFileSync(path.join(ROOT, "app/admin/leads/[id]/page.tsx"), "utf8");
  assert.ok(/from '@\/lib\/pricing'/.test(page), "page imports the pricing helper");
  assert.ok(/suggestPricing\(/.test(page), "page computes a suggestion from the lead");
  assert.ok(/<SuggestedPricing\b/.test(page), "page renders the SuggestedPricing panel");
  // The editable quote field the copy buttons target must exist.
  assert.ok(/id="quote_amount_input"/.test(page), "quote amount field is targetable for copy");
});

test("the pricing panel copies a suggestion into the editable quote field", () => {
  const panel = fs.readFileSync(
    path.join(ROOT, "app/admin/leads/[id]/SuggestedPricing.tsx"),
    "utf8",
  );
  assert.ok(/quote_amount_input/.test(panel), "panel writes into the quote amount input");
  assert.ok(/→ quote/.test(panel), "panel exposes a copy-to-quote action");
});

test("a realistic lead produces a renderable suggestion object", () => {
  // Shape the admin page relies on: a range to show + copy, adjustments, and notes.
  const s = suggestPricing({
    itemType: "bulk-item-pickup",
    pickupLocation: "garage",
    heavyItems: false,
    details: "A few boxes and an old dresser",
  });
  assert.ok(s.range && typeof s.range.low === "number" && typeof s.range.high === "number");
  assert.ok(Array.isArray(s.bands) && s.bands.length >= 1);
  assert.ok(Array.isArray(s.notes));
});
