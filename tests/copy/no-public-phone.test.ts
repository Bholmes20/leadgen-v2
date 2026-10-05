// Public phone / call-CTA guardrail.
//
// Decision (2026-10): the public website no longer exposes a business phone number or
// encourages calls. Customers are driven to the online pickup request form
// (/leads/new); the business follows up by phone/text/email from the submitted lead.
//
// This test fails the build if a call-to-call ever reappears on a customer- or
// search-engine-facing surface:
//   • the ESEE business phone number (706-828-1733), in any separator form
//   • tel: links
//   • "Call 706…" / "Call or text" CTAs
//
// INTENTIONALLY NOT SCANNED (internal / outbound, not public web pages):
//   • lib/email.ts, lib/followup.ts — outbound email/SMS to a lead that already
//     submitted, so the business can follow up and the customer can reach back.
//   • app/admin/** — internal admin UI (click-to-call on captured lead/contractor
//     numbers is a staff convenience, never shown to the public).
//
// When you add a new PUBLIC copy surface, add its path to PUBLIC_FILES so it's covered.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// Every file that renders words/markup a customer, prospect, or search engine can see.
const PUBLIC_FILES = [
  "app/page.tsx",
  "app/layout.tsx",
  "app/junk-removal-augusta-ga/page.tsx",
  "app/leads/new/page.tsx",
  "app/leads/new/LeadForm.tsx",
  "app/[slug]/page.tsx",
  "components/seo/LandingPage.tsx",
  "components/seo/NicheHub.tsx",
  "components/seo/CityHub.tsx",
  "components/seo/chrome.tsx",
  "lib/site.ts",
  "lib/seo/schema.ts",
  "lib/seo/niches.ts",
  "lib/seo/content.ts",
  "lib/seo/cities.ts",
  "lib/pickup.ts",
  "lib/adgen/content.ts",
];

type Rule = { label: string; re: RegExp };

const BANNED: Rule[] = [
  // The ESEE business phone number, in any separator form (706-828-1733, 7068281733,
  // 706.828.1733, (706) 828-1733, …).
  { label: "ESEE business phone number", re: /706\D?828\D?1733/ },
  // tel: links (NOT type="tel", which has no colon, so it won't match).
  { label: "tel: link", re: /tel:/ },
  // Call CTAs.
  { label: '"Call 706…" CTA', re: /call\s*706/i },
  { label: '"Call or text" CTA', re: /call or text/i },
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

for (const rel of PUBLIC_FILES) {
  test(`no public phone number or call CTA in ${rel}`, () => {
    const text = read(rel);
    for (const { label, re } of BANNED) {
      const m = text.match(re);
      assert.equal(
        m,
        null,
        `${rel} exposes a phone number / call CTA (${label}): ${JSON.stringify(m?.[0])}`,
      );
    }
  });
}

// The lead form must still collect the customer's phone number — the business needs it
// to follow up. Removing calls from the PUBLIC site must not drop this field.
test("lead form still asks the customer for a phone number", () => {
  const form = read("app/leads/new/LeadForm.tsx");
  assert.ok(/Phone\s*\*/.test(form), "form shows a required Phone label");
  assert.ok(form.includes('type="tel"'), "form has a tel input for the phone number");
  assert.ok(
    form.includes('fd.append("phone", phone)'),
    "form submits the customer phone value",
  );
});

// The public Organization structured data must not carry a telephone (which would
// re-expose the number to search engines). Guards lib/seo/schema.ts specifically.
test("Organization schema exposes no telephone", () => {
  const schema = read("lib/seo/schema.ts");
  assert.ok(
    !/telephone/i.test(schema),
    "lib/seo/schema.ts must not set a telephone in structured data",
  );
});
