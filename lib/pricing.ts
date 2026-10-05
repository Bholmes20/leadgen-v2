// Internal Pricing Guide v1 — ADMIN ONLY.
//
// ⚠️  NEVER import this module from a public page/component. These numbers are
// internal quoting guidance for Brandon on the admin lead-detail screen. The public
// site shows no prices (see tests/copy/compliance.test.ts, which bans `$\d` in public
// copy, and tests/copy/no-public-phone.test.ts). A dedicated guard test asserts no
// public source imports `@/lib/pricing`.
//
// Pricing strategy (baseline bands are quoted at CURBSIDE prices; harder access adds
// an adjustment on top):
//   • Curbside / driveway        → lowest quote (prefer the low end of the band)
//   • Garage / first-floor / easy → middle of the band
//   • Inside / upstairs / apt / long carry → higher end + access adjustment
//   • Multiple items             → bundle manually, don't just stack bands
//   • The final quote stays editable — this is guidance, not an auto-quote.

// All amounts are whole dollars. `openEnded` marks the "+" bands whose real-world high
// can exceed `high` on a big/complex job (scope it on site).
export type PriceBand = {
  id: string;
  label: string;
  low: number;
  high: number;
  openEnded?: boolean;
  note?: string;
};

export const PRICING_BANDS: readonly PriceBand[] = [
  { id: "mattress-curbside", label: "Mattress — curbside", low: 75, high: 110 },
  { id: "mattress-boxspring-curbside", label: "Mattress + box spring — curbside", low: 100, high: 140 },
  { id: "couch-curbside", label: "Couch — curbside", low: 90, high: 140 },
  { id: "sectional-curbside", label: "Sectional — curbside", low: 150, high: 250 },
  { id: "washer-dryer-single", label: "Washer or dryer — curbside/garage", low: 90, high: 150 },
  { id: "washer-dryer-set", label: "Washer + dryer set", low: 175, high: 250 },
  { id: "appliance-inside", label: "Appliance — inside / laundry room", low: 150, high: 250, openEnded: true },
  { id: "bulk-1-3-curbside", label: "1–3 bulk items — curbside", low: 100, high: 225 },
  { id: "small-load", label: "Small load", low: 150, high: 300 },
  { id: "half-load", label: "Half load", low: 275, high: 475 },
  { id: "full-load", label: "Full load", low: 450, high: 750, openEnded: true },
  { id: "rental-cleanout", label: "Rental cleanout", low: 350, high: 1500, openEnded: true },
  { id: "tenant-trash-out", label: "Tenant trash-out", low: 500, high: 2000, openEnded: true },
] as const;

export type AccessAdjustment = {
  id: string;
  label: string;
  low: number;
  high: number;
  note?: string;
};

export const ACCESS_ADJUSTMENTS: readonly AccessAdjustment[] = [
  { id: "inside", label: "Inside pickup", low: 25, high: 75 },
  { id: "upstairs", label: "Upstairs", low: 50, high: 150 },
  { id: "apartment", label: "Apartment / long carry", low: 50, high: 150 },
  { id: "heavy", label: "Heavy item", low: 50, high: 200 },
  { id: "soiled", label: "Dirty / soiled item", low: 25, high: 100 },
] as const;

// Shown verbatim in the admin panel so the strategy travels with the numbers.
export const PRICING_STRATEGY: readonly string[] = [
  "Curbside / driveway = lowest quote — prefer the low end.",
  "Garage / first-floor / easy access = middle of the band.",
  "Inside / upstairs / apartment / long carry = higher end, plus access adjustments.",
  "Multiple items: bundle manually — don't just stack bands.",
  "The final quote stays editable. This is guidance, not an auto-quote.",
] as const;

function band(id: string): PriceBand {
  const b = PRICING_BANDS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown price band: ${id}`);
  return b;
}

// Which base band(s) an item_type suggests. Several item types are genuinely ambiguous
// without Brandon's eyes on the photos (a "furniture pickup" could be a single couch or
// a sectional; "junk removal" could be a small load or a full truck) — so we return the
// plausible candidates, cheapest first, rather than pretending we know the one answer.
function matchBands(itemType: string): PriceBand[] {
  switch (itemType) {
    case "mattress-pickup":
      return [band("mattress-curbside"), band("mattress-boxspring-curbside")];
    case "furniture-pickup":
      return [band("couch-curbside"), band("sectional-curbside")];
    case "bulk-item-pickup":
      return [band("bulk-1-3-curbside"), band("small-load")];
    case "junk-removal":
      return [band("small-load"), band("half-load"), band("full-load")];
    case "rental-cleanout":
      return [band("rental-cleanout")];
    case "tenant-trash-out":
      return [band("tenant-trash-out")];
    // carpet-removal and "other" have no standard band — quote manually.
    default:
      return [];
  }
}

// Keywords in the free-text details that imply a soiled/dirty item surcharge.
const SOILED_RE =
  /\b(soiled|dirty|stain(?:ed)?|urine|pet[\s-]?(?:stain|damage|urine)|feces|mold(?:y|ed)?|mildew|rotte?n|maggot|biohazard|water[\s-]?damag|wet)\b/i;

export type PricingLeadInput = {
  itemType?: string | null;
  pickupLocation?: string | null;
  heavyItems?: boolean | null;
  details?: string | null;
};

function matchAdjustments(input: PricingLeadInput): AccessAdjustment[] {
  const out: AccessAdjustment[] = [];
  const get = (id: string) => ACCESS_ADJUSTMENTS.find((a) => a.id === id)!;

  switch (input.pickupLocation) {
    case "inside-first-floor":
    case "storage-unit":
      out.push(get("inside"));
      break;
    case "upstairs":
      out.push(get("upstairs"));
      break;
    case "apartment":
      out.push(get("apartment"));
      break;
    // curbside / garage / whole-unit: no per-item access add (garage = easy; whole-unit
    // scope lives in the cleanout band itself).
  }

  if (input.heavyItems) out.push(get("heavy"));
  if (input.details && SOILED_RE.test(input.details)) out.push(get("soiled"));

  return out;
}

export type PricingSuggestion = {
  // Candidate base bands (cheapest first). Empty when the item type has no standard band.
  bands: PriceBand[];
  // Access adjustments implied by the lead's access/condition fields.
  adjustments: AccessAdjustment[];
  // The primary (cheapest) band with adjustments applied — a concrete starting range.
  // null when there is no matched band.
  range: { low: number; high: number; openEnded: boolean } | null;
  // Human-readable rationale lines ("why this band / these adds").
  notes: string[];
  // True when there's exactly one matched band and it isn't an open-ended scope job —
  // i.e. a clean range Brandon can copy straight into the quote field.
  simple: boolean;
};

export function suggestPricing(input: PricingLeadInput): PricingSuggestion {
  const bands = matchBands(input.itemType ?? "");
  const adjustments = matchAdjustments(input);
  const notes: string[] = [];

  const primary = bands[0] ?? null;
  const addLow = adjustments.reduce((s, a) => s + a.low, 0);
  const addHigh = adjustments.reduce((s, a) => s + a.high, 0);
  const range = primary
    ? { low: primary.low + addLow, high: primary.high + addHigh, openEnded: !!primary.openEnded }
    : null;

  // Rationale.
  if (!primary) {
    notes.push(
      input.itemType === "carpet-removal"
        ? "Carpet / padding removal has no standard band — quote from rooms, condition, and carry; use a load band as a sanity check."
        : "No standard band for this request — pick the closest load band below and quote manually.",
    );
  } else if (bands.length > 1) {
    notes.push(
      `More than one band could fit — start at ${PRICING_BANDS.indexOf(primary) >= 0 ? primary.label : "the lowest"} and size up from the photos.`,
    );
  }

  switch (input.pickupLocation) {
    case "curbside":
      notes.push("Curbside / driveway — easiest access, prefer the low end of the band.");
      break;
    case "garage":
      notes.push("Garage / carport — easy access, aim for the middle of the band.");
      break;
    case "inside-first-floor":
      notes.push("Inside, first floor — add the inside-pickup adjustment.");
      break;
    case "upstairs":
      notes.push("Upstairs — add the stairs/upstairs adjustment; lean to the higher end.");
      break;
    case "apartment":
      notes.push("Apartment — long carry/elevator is likely; add the long-carry adjustment.");
      break;
    case "storage-unit":
      notes.push("Storage unit — expect a carry; add the inside adjustment and confirm access.");
      break;
    case "whole-unit":
      notes.push("Whole unit / property — scope the full cleanout on site; the band is a starting point.");
      break;
  }

  if (input.heavyItems) notes.push("Heavy / disassembly flagged — add the heavy-item adjustment.");
  if (input.details && SOILED_RE.test(input.details)) {
    notes.push("Details mention a soiled/damaged item — add the dirty/soiled adjustment.");
  }
  if (adjustments.length > 1 || (bands.length > 1 && adjustments.length >= 1)) {
    notes.push("Multiple factors — bundle the adjustments manually rather than stacking blindly.");
  }

  const simple = bands.length === 1 && !primary?.openEnded;

  return { bands, adjustments, range, notes, simple };
}

// Display helpers (used by the admin panel).
export function formatBand(b: Pick<PriceBand, "low" | "high" | "openEnded">): string {
  return `$${b.low.toLocaleString()}–$${b.high.toLocaleString()}${b.openEnded ? "+" : ""}`;
}

export function formatAdjustment(a: Pick<AccessAdjustment, "low" | "high">): string {
  return `+$${a.low.toLocaleString()}–$${a.high.toLocaleString()}`;
}
