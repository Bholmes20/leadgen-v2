import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ITEM_TYPES,
  PICKUP_LOCATIONS,
  QUOTE_STATUSES,
  ROUTING_SERVICE,
  CURBSIDE_COPY,
  isValidItemType,
  isValidPickupLocation,
  isValidQuoteStatus,
  itemTypeLabel,
  pickupLocationLabel,
  requiresFloorDetails,
  requiresPropertyAccess,
  isCarpet,
} from "../../lib/pickup";
import { buildSlackQuotePayload, SLACK_ALERT_TITLE, adminLeadUrl } from "../../lib/slack";
import { buildQuoteEmailHtml, quoteEmailSubject } from "../../lib/email";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ── Service options ──────────────────────────────────────────────────────────

test("the eight pickup/cleanout service options are present and landscaping is gone", () => {
  const values = ITEM_TYPES.map((t) => t.value);
  assert.deepEqual(values, [
    "junk-removal",
    "bulk-item-pickup",
    "mattress-pickup",
    "furniture-pickup",
    "rental-cleanout",
    "tenant-trash-out",
    "carpet-removal",
    "other",
  ]);
  assert.ok(!values.includes("landscaping" as never), "landscaping must not be an option");
});

test("new service options are accepted and landscaping is rejected", () => {
  for (const { value } of ITEM_TYPES) {
    assert.equal(isValidItemType(value), true, `${value} should be valid`);
  }
  assert.equal(isValidItemType("landscaping"), false);
  assert.equal(isValidItemType("lawn-care"), false);
  assert.equal(isValidItemType(""), false);
});

test("every item type routes through the junk-removal CRM service", () => {
  assert.equal(ROUTING_SERVICE, "junk-removal");
});

test("curbside/driveway is the recommended default pickup location", () => {
  assert.equal(PICKUP_LOCATIONS[0].value, "curbside");
  assert.equal(PICKUP_LOCATIONS[0].recommended, true);
  const recommended = PICKUP_LOCATIONS.filter((l) => l.recommended);
  assert.equal(recommended.length, 1, "exactly one recommended location");
  assert.equal(isValidPickupLocation("curbside"), true);
  assert.equal(isValidPickupLocation("backyard"), false);
});

test("quote statuses cover the required lifecycle", () => {
  for (const s of ["submitted", "needs_quote", "quoted", "quote_sent", "scheduled", "completed", "cancelled", "rejected"]) {
    assert.equal(isValidQuoteStatus(s), true, `${s} should be a valid quote status`);
    assert.ok(QUOTE_STATUSES.includes(s as never));
  }
  assert.equal(isValidQuoteStatus("paid"), false);
});

test("conditional-field helpers fire for the right selections", () => {
  assert.equal(requiresFloorDetails("upstairs"), true);
  assert.equal(requiresFloorDetails("apartment"), true);
  assert.equal(requiresFloorDetails("curbside"), false);
  assert.equal(requiresPropertyAccess("rental-cleanout"), true);
  assert.equal(requiresPropertyAccess("tenant-trash-out"), true);
  assert.equal(requiresPropertyAccess("junk-removal"), false);
  assert.equal(isCarpet("carpet-removal"), true);
  assert.equal(isCarpet("junk-removal"), false);
});

// ── Customer-facing flow has no landscaping ──────────────────────────────────

test("the request form has no landscaping and shows the pickup services + curbside copy", () => {
  const form = read("app/leads/new/LeadForm.tsx");
  assert.ok(!/landscaping/i.test(form), "LeadForm must not mention landscaping");
  assert.ok(form.includes("ITEM_TYPES"), "form renders the shared item types");
  assert.ok(form.includes("PICKUP_LOCATIONS"), "form renders the shared pickup locations");
  assert.ok(form.includes("CURBSIDE_COPY"), "form shows the curbside-encouragement copy");
});

test("the curbside copy reads as specified", () => {
  assert.ok(CURBSIDE_COPY.toLowerCase().includes("curbside"));
  assert.ok(CURBSIDE_COPY.toLowerCase().includes("fastest"));
});

test("the lead API no longer references landscaping and routes via the shared service", () => {
  const route = read("app/api/leads/route.ts");
  assert.ok(!/landscaping/i.test(route), "API route must not reference landscaping");
  assert.ok(route.includes("ROUTING_SERVICE"), "API routes via the shared routing service");
  assert.ok(route.includes("isValidItemType"), "API validates the item type");
});

// ── Slack quote-review payload ───────────────────────────────────────────────

test("Slack payload includes all quote-review info", () => {
  const { text, blocks } = buildSlackQuotePayload({
    id: "lead-123",
    name: "Jane Smith",
    phone: "(706) 555-0100",
    email: "jane@example.com",
    address: "123 Canterbury Farms Dr, Grovetown, GA",
    zip: "30813",
    itemTypeLabel: itemTypeLabel("mattress-pickup"),
    pickupLocationLabel: pickupLocationLabel("curbside"),
    preferredTiming: "2026-10-10 (Morning)",
    details: "Queen mattress + box spring at the curb",
    photoPaths: ["/uploads/a.jpg", "/uploads/b.jpg"],
  });

  assert.ok(text.includes(SLACK_ALERT_TITLE));
  assert.ok(text.includes("New Grovetown Pickup Request — Quote Needed"));
  assert.ok(text.includes("Jane Smith"));
  assert.ok(text.includes("(706) 555-0100"));
  assert.ok(text.includes("jane@example.com"));
  assert.ok(text.includes("123 Canterbury Farms Dr, Grovetown, GA"));
  assert.ok(text.includes("30813"));
  assert.ok(text.includes("Mattress / box spring pickup"));
  assert.ok(text.includes("Curbside / driveway pickup"));
  assert.ok(text.includes("2026-10-10 (Morning)"));
  assert.ok(text.includes("Queen mattress + box spring at the curb"));
  // photo links are absolutized and the admin review link is present
  assert.ok(text.includes("https://leads.eseeent.com/uploads/a.jpg"));
  assert.ok(text.includes("https://leads.eseeent.com/uploads/b.jpg"));
  assert.ok(text.includes(adminLeadUrl("lead-123")));

  assert.ok(Array.isArray(blocks) && blocks.length > 0);
  assert.equal((blocks[0] as { type: string }).type, "header");
});

test("Slack payload handles a request with no photos gracefully", () => {
  const { text } = buildSlackQuotePayload({
    id: "lead-9",
    name: "No Photos",
    phone: "706-000-0000",
    email: "x@y.com",
    address: "1 Main St",
    zip: null,
    itemTypeLabel: "Junk removal",
    pickupLocationLabel: "Curbside / driveway pickup",
    preferredTiming: "No preference given",
    details: "",
    photoPaths: [],
  });
  assert.ok(text.includes("No photos uploaded"));
  assert.ok(text.includes("None provided"));
});

// ── Quote email render ───────────────────────────────────────────────────────

test("quote email renders amount, notes, accept instructions, and phone", () => {
  const html = buildQuoteEmailHtml({
    name: "Jane Smith",
    email: "jane@example.com",
    serviceLabel: "Mattress / box spring pickup",
    quoteAmountCents: 12345,
    depositAmountCents: 5000,
    notes: "Curbside pickup of one mattress and box spring, haul-away included.",
    exclusions: "Does not include inside-home removal.",
  });

  assert.ok(html.includes("$123.45"), "shows the quote amount");
  assert.ok(html.includes("$50.00"), "shows the deposit amount");
  assert.ok(html.includes("Curbside pickup of one mattress"), "shows included notes");
  assert.ok(html.includes("Does not include inside-home removal."), "shows exclusions");
  assert.ok(/to accept/i.test(html), "explains how to accept");
  assert.ok(html.includes("706-828-1733"), "shows the Esee phone number");
  assert.ok(html.includes("Jane Smith"));
});

test("quote email subject names the service", () => {
  const subject = quoteEmailSubject({
    name: "A",
    email: "a@b.com",
    serviceLabel: "Rental cleanout",
    quoteAmountCents: 1000,
  });
  assert.ok(subject.includes("Rental cleanout"));
  assert.ok(subject.includes("Esee Property Services"));
});
