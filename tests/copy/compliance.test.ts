// Copy-positioning guardrail.
//
// ESEE is the customer-facing property services company and manages every job from
// quote to completion; the work is done by ESEE directly or by an approved local
// service partner. This test keeps customer-facing copy on-message by failing the
// build if banned wording reappears:
//   • platform / lead-marketplace framing ("we'll match you", "your provider", …)
//   • fixed prices and price ranges
//   • same-day / next-day turnaround promises
//   • flat-rate / no-surprise / no-hidden-fee claims
//   • false urgency ("limited slots", "filling fast", …)
//   • over-broad scope claims ("anything hauled away", "nothing too big", …)
//   • unsupported ratings / reviews / licenses / guarantees / track-record claims
//
// When you add a new customer-facing copy surface, add its path to COPY_FILES so it's
// covered too.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// Every file that renders words a customer, prospect, or search engine can see.
const COPY_FILES = [
  "lib/site.ts",
  "lib/seo/schema.ts",
  "lib/seo/niches.ts",
  "lib/seo/content.ts",
  "components/seo/LandingPage.tsx",
  "components/seo/NicheHub.tsx",
  "components/seo/CityHub.tsx",
  "components/seo/chrome.tsx",
  "app/page.tsx",
  "app/layout.tsx",
  "app/[slug]/page.tsx",
  "app/junk-removal-augusta-ga/page.tsx",
  "app/leads/new/page.tsx",
  "app/leads/new/LeadForm.tsx",
  "lib/pickup.ts",
  "lib/adgen/content.ts",
  "lib/email.ts",
  "lib/followup.ts",
  "lib/graphics/templates/junk-removal.html",
  "lib/graphics/templates/landscaping.html",
];

// Dollar amounts are forbidden in customer copy, but followup.ts also builds an
// INTERNAL lead alert to the business owner that interpolates an estimate range
// ("Est: $…-$…"). That text never reaches a customer, so exempt it from the price
// rule only (it is still checked for every other banned pattern).
const PRICE_EXEMPT = new Set(["lib/followup.ts"]);

type Rule = { label: string; re: RegExp };

const BANNED: Rule[] = [
  // Platform / lead-marketplace framing.
  { label: "service-matching platform framing", re: /service-matching platform/i },
  { label: '"we(\'ll) match you" framing', re: /\bwe(?:'|’)?ll match you\b|\bwe will match you\b|\bwe match you\b/i },
  { label: '"connect(s) you with" framing', re: /connects? you with/i },
  { label: '"connect(s) your request" framing', re: /connects? your request/i },
  { label: '"we connect" framing', re: /\bwe connect\b/i },
  { label: '"your provider" framing', re: /\byour provider\b/i },
  { label: '"get matched/connected" framing', re: /\bget (?:matched|connected)\b/i },
  { label: '"local haulers/pros/providers" framing', re: /\blocal (?:haulers?|pros?|providers?)\b/i },

  // Same-day / next-day turnaround promises.
  { label: "same-day / next-day promise", re: /\bsame[\s-]?day\b|\bnext[\s-]?day\b/i },

  // Flat-rate / no-surprise / no-hidden-fee claims.
  { label: "flat-rate / no-surprise / no-hidden-fee claim", re: /\bflat[\s-]?rate\b|\bno[\s-]?surprise|\bno hidden fee/i },

  // False urgency.
  { label: "false-urgency scarcity claim", re: /\blimited slots?\b|\bslots? (?:are )?(?:almost )?full\b|\bslots fill\b|\bspots (?:are )?fill|\bfilling fast\b|\blimited availability\b|\bbook before\b|\bfirst[\s-]?come\b/i },

  // Near-term availability / booking promises we can't guarantee. Customer-action
  // prompts like "request your quote this week" are fine — these ban only claims that
  // WE are available/can book at a specific near time.
  { label: "near-term availability claim", re: /\bsame[\s-]?week\b|\bavailable (?:this|next|same)[\s-]?week(?:end)?\b|\bopenings this week\b|\bweekend availability\b|\bbook this week\b|\bon the schedule this week\b/i },

  // Over-broad scope claims.
  { label: "over-broad scope claim", re: /\bnothing too (?:big|small)\b|\banything hauled away\b|\bno job too small\b|\bpretty much anything\b|\btake it all\b/i },

  // Unsupported ratings / reviews / track record.
  { label: "unsupported ratings / review / track-record claim", re: /\b5[\s-]?star\b|\bfive[\s-]?star\b|\bstar[\s-]?rated\b|\bhundreds of (?:happy|satisfied)\b|\bhappy customers\b|\btrusted by\b/i },

  // Unsupported license / insurance / guarantee claims about ESEE. (Referring to a
  // third-party "licensed arborist/abatement contractor" as out of scope is fine, so
  // the bare word "licensed" is intentionally not banned.)
  { label: "unsupported license / insurance / guarantee claim", re: /\blicensed (?:and|&) insured\b|\bfully (?:licensed|insured)\b|\bwe(?:'|’)?re licensed\b|\bwe are licensed\b|\bguarantee/i },
];

const PRICE_RE = /\$\s?\d/;

function read(rel: string): string {
  const abs = path.join(ROOT, rel);
  return fs.readFileSync(abs, "utf8");
}

for (const rel of COPY_FILES) {
  test(`no banned wording in ${rel}`, () => {
    const text = read(rel);
    for (const { label, re } of BANNED) {
      const m = text.match(re);
      assert.equal(
        m,
        null,
        `${rel} contains banned wording (${label}): ${JSON.stringify(m?.[0])}`,
      );
    }
    if (!PRICE_EXEMPT.has(rel)) {
      const pm = text.match(PRICE_RE);
      assert.equal(
        pm,
        null,
        `${rel} contains a fixed price / price range: ${JSON.stringify(pm?.[0])}`,
      );
    }
  });
}

// The standard disclosure must stay exact and centralized so every surface uses the
// same approved wording. If this text changes, update it in lib/site.ts intentionally.
const EXPECTED_DISCLOSURE =
  "Esee Property Services manages your job from quote to completion. Depending on the job and location, the work is done by ESEE directly or by an approved local service partner. We confirm scope and price with you before any work begins.";

test("standard disclosure is defined verbatim in lib/site.ts", () => {
  const site = read("lib/site.ts");
  assert.ok(
    site.includes(EXPECTED_DISCLOSURE),
    "lib/site.ts must export the exact standard disclosure text",
  );
});

test("standard disclosure is surfaced on key pages", () => {
  // Homepage + hub components + the standalone Augusta page should all pull the
  // disclosure from the shared constant (or inline the exact words, as email does).
  const usesConstant = [
    "app/page.tsx",
    "app/junk-removal-augusta-ga/page.tsx",
    "app/leads/new/LeadForm.tsx",
    "components/seo/CityHub.tsx",
    "components/seo/NicheHub.tsx",
    "components/seo/LandingPage.tsx",
  ];
  for (const rel of usesConstant) {
    assert.ok(
      read(rel).includes("SERVICE_DISCLOSURE"),
      `${rel} should reference the shared SERVICE_DISCLOSURE constant`,
    );
  }
  // The confirmation email inlines the exact disclosure wording in its footer.
  assert.ok(
    read("lib/email.ts").includes("done by ESEE directly") &&
      read("lib/email.ts").includes("approved local service partner"),
    "lib/email.ts footer should include the standard disclosure wording",
  );
});
