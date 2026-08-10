// Normalizes a lead's attribution into a row in the existing `lead_sources` table and
// returns its id for `leads.source_id`. Reuses the Phase-1 lead_sources infrastructure.
// Fully defensive: never throws, so it can never fail a lead submission.

import db from "./db";
import { v4 as uuidv4 } from "uuid";
import type { Attribution } from "./attribution";

export type Channel = "search" | "social" | "referral" | "direct" | "other";

const SEARCH_HOSTS = ["google", "bing", "yahoo", "duckduckgo", "ecosia", "baidu"];
const SOCIAL_SOURCES = [
  "facebook",
  "instagram",
  "meta",
  "fb",
  "ig",
  "nextdoor",
  "tiktok",
  "twitter",
  "linkedin",
  "youtube",
  "pinterest",
];

export function classifyChannel(a: Attribution): Channel {
  const medium = (a.utm_medium ?? "").toLowerCase();
  const source = (a.utm_source ?? "").toLowerCase();

  if (medium) {
    if (["cpc", "ppc", "paidsearch", "paid-search", "sem"].includes(medium)) return "search";
    if (medium.includes("social")) return "social";
    if (medium === "organic") return "search";
    if (medium === "email") return "other";
    if (medium === "referral") return "referral";
  }
  if (source) {
    if (SOCIAL_SOURCES.includes(source)) return "social";
    if (SEARCH_HOSTS.includes(source)) return "search";
    return "referral";
  }
  if (a.referrer) {
    try {
      const host = new URL(a.referrer).host.toLowerCase();
      if (SEARCH_HOSTS.some((h) => host.includes(h))) return "search";
      if (SOCIAL_SOURCES.some((s) => host.includes(s))) return "social";
      return "referral";
    } catch {
      /* ignore malformed referrer */
    }
  }
  return "direct";
}

// Cap normalized source names so a malformed/oversized UTM value can't create an
// absurdly long lead_sources row. 64 chars is plenty for real source names.
const MAX_SOURCE_NAME_LEN = 64;

export function deriveSourceName(a: Attribution): string {
  let name = "direct";
  if (a.utm_source) {
    name = a.utm_source.toLowerCase();
  } else if (a.referrer) {
    try {
      name = new URL(a.referrer).host.toLowerCase().replace(/^www\./, "");
    } catch {
      /* ignore malformed referrer — fall back to "direct" */
    }
  }
  return name.slice(0, MAX_SOURCE_NAME_LEN);
}

/**
 * Upsert a lead_sources row for this attribution and return its id (or null on any
 * failure). Uses INSERT OR IGNORE against the table's UNIQUE(name) constraint so
 * concurrent submissions can't error.
 */
export function resolveSourceId(a: Attribution): string | null {
  try {
    const name = deriveSourceName(a);
    const channel = classifyChannel(a);
    db.prepare(
      "INSERT OR IGNORE INTO lead_sources (id, name, channel, is_active) VALUES (?, ?, ?, 1)",
    ).run(uuidv4(), name, channel);
    const row = db.prepare("SELECT id FROM lead_sources WHERE name = ?").get(name) as
      | { id: string }
      | undefined;
    return row?.id ?? null;
  } catch (err) {
    console.error("resolveSourceId failed:", err);
    return null;
  }
}
