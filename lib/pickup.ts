// Shared vocabulary for the pickup / cleanout request flow.
//
// ESEE's public funnel is pickup/cleanout only (no landscaping). The customer picks
// an `item_type` and a `pickup_location`; every item_type routes to the single CRM
// routing service "junk-removal" so contractor matching, the internal estimate, and
// follow-ups keep working unchanged. The form, the /api/leads handler, the admin UI,
// and the tests all import these constants so there is one source of truth.

export const ROUTING_SERVICE = "junk-removal" as const;

export const ITEM_TYPES = [
  { value: "junk-removal", label: "Junk removal" },
  { value: "bulk-item-pickup", label: "Bulk item pickup" },
  { value: "mattress-pickup", label: "Mattress / box spring pickup" },
  { value: "furniture-pickup", label: "Furniture / couch pickup" },
  { value: "rental-cleanout", label: "Rental cleanout" },
  { value: "tenant-trash-out", label: "Tenant trash-out" },
  { value: "carpet-removal", label: "Carpet / padding removal" },
  { value: "other", label: "Other pickup / cleanout" },
] as const;

export type ItemType = (typeof ITEM_TYPES)[number]["value"];

export const PICKUP_LOCATIONS = [
  { value: "curbside", label: "Curbside / driveway pickup", recommended: true },
  { value: "garage", label: "Garage / carport", recommended: false },
  { value: "inside-first-floor", label: "Inside first floor", recommended: false },
  { value: "upstairs", label: "Upstairs", recommended: false },
  { value: "apartment", label: "Apartment", recommended: false },
  { value: "storage-unit", label: "Storage unit", recommended: false },
  { value: "whole-unit", label: "Rental property / whole unit", recommended: false },
] as const;

export type PickupLocation = (typeof PICKUP_LOCATIONS)[number]["value"];

// Customer-facing nudge toward the fastest-to-quote option. Rendered on the form.
export const CURBSIDE_COPY =
  "Curbside or driveway pickup is usually the fastest and easiest to quote. If you can safely place items outside, choose this option.";

// Quote lifecycle, tracked in leads.quote_status (distinct from the CRM leads.status
// enum used by follow-ups, so neither interferes with the other).
export const QUOTE_STATUSES = [
  "submitted",
  "needs_quote",
  "quoted",
  "quote_sent",
  "scheduled",
  "completed",
  "cancelled",
  "rejected",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// Payment lifecycle — placeholders for later Stripe work. Nothing writes these yet
// beyond the "none" default; kept here so the schema and admin can reference them.
export const PAYMENT_STATUSES = [
  "none",
  "deposit_due",
  "deposit_paid",
  "paid",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const ITEM_TYPE_VALUES = new Set<string>(ITEM_TYPES.map((t) => t.value));
const PICKUP_LOCATION_VALUES = new Set<string>(PICKUP_LOCATIONS.map((l) => l.value));
const QUOTE_STATUS_VALUES = new Set<string>(QUOTE_STATUSES);

export function isValidItemType(v: unknown): v is ItemType {
  return typeof v === "string" && ITEM_TYPE_VALUES.has(v);
}

export function isValidPickupLocation(v: unknown): v is PickupLocation {
  return typeof v === "string" && PICKUP_LOCATION_VALUES.has(v);
}

export function isValidQuoteStatus(v: unknown): v is QuoteStatus {
  return typeof v === "string" && QUOTE_STATUS_VALUES.has(v);
}

export function itemTypeLabel(v: string): string {
  return ITEM_TYPES.find((t) => t.value === v)?.label ?? v;
}

export function pickupLocationLabel(v: string): string {
  return PICKUP_LOCATIONS.find((l) => l.value === v)?.label ?? v;
}

// Locations where items are not already at the curb — the form reveals access detail
// questions (stairs/floor, items-already-outside, etc.) for these.
const INSIDE_LOCATIONS = new Set<string>([
  "garage",
  "inside-first-floor",
  "upstairs",
  "apartment",
  "storage-unit",
  "whole-unit",
]);

export function requiresAccessDetails(location: string): boolean {
  return INSIDE_LOCATIONS.has(location);
}

// Locations with a vertical carry — the form asks for floor / stairs / elevator.
export function requiresFloorDetails(location: string): boolean {
  return location === "upstairs" || location === "apartment";
}

// Item types that are a whole-property job — the form asks occupancy + access (lockbox/key).
export function requiresPropertyAccess(itemType: string): boolean {
  return (
    itemType === "rental-cleanout" ||
    itemType === "tenant-trash-out"
  );
}

export function isCarpet(itemType: string): boolean {
  return itemType === "carpet-removal";
}

export const CARPET_CONDITIONS = [
  { value: "normal", label: "Normal / dry" },
  { value: "wet", label: "Wet / water-damaged" },
  { value: "pet", label: "Pet-damaged" },
  { value: "both", label: "Wet and pet-damaged" },
] as const;

export const PREFERRED_WINDOWS = [
  { value: "flexible", label: "Flexible" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
] as const;

// Map an SEO niche slug (attribution) to a pickup item_type, for prefilling the form
// when a visitor arrives from a niche landing page. Unknown niches → null (no prefill).
export function itemTypeForNiche(niche: string | null | undefined): ItemType | null {
  switch (niche) {
    case "rental-property-cleanout":
      return "rental-cleanout";
    case "tenant-trash-out":
      return "tenant-trash-out";
    case "carpet-removal":
      return "carpet-removal";
    case "mattress-removal":
      return "mattress-pickup";
    case "furniture-removal":
      return "furniture-pickup";
    case "bulk-item-pickup":
      return "bulk-item-pickup";
    case "appliance-removal":
      // No dedicated appliance item type; appliances route through bulk-item pickup.
      return "bulk-item-pickup";
    default:
      return null;
  }
}
