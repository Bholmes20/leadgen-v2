// Niche repository — the research universe of services we might offer.
// Distinct from lib/seo/niches.ts (the published-page registry): this is the
// broader set of candidate verticals we're still evaluating. `lead_service`
// links back to a CRM service when a niche graduates to a live one.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import type { Niche } from "./types";

export interface NicheInput {
  slug: string;
  label: string;
  lead_service?: string | null;
  seasonality?: string | null;
  ticket_band_low?: number | null;
  ticket_band_high?: number | null;
  margin_band_low?: number | null;
  margin_band_high?: number | null;
  recurring_b2b?: boolean;
  notes?: string | null;
  is_seed?: boolean;
}

export function upsertNiche(input: NicheInput): Niche {
  const existing = findNiche(input.slug);
  if (existing) {
    db.prepare(
      `UPDATE intel_niches
         SET label = ?,
             lead_service = COALESCE(?, lead_service),
             seasonality = COALESCE(?, seasonality),
             ticket_band_low = COALESCE(?, ticket_band_low),
             ticket_band_high = COALESCE(?, ticket_band_high),
             margin_band_low = COALESCE(?, margin_band_low),
             margin_band_high = COALESCE(?, margin_band_high),
             recurring_b2b = ?,
             notes = COALESCE(?, notes)
       WHERE id = ?`,
    ).run(
      input.label,
      input.lead_service ?? null,
      input.seasonality ?? null,
      input.ticket_band_low ?? null,
      input.ticket_band_high ?? null,
      input.margin_band_low ?? null,
      input.margin_band_high ?? null,
      input.recurring_b2b ? 1 : 0,
      input.notes ?? null,
      existing.id,
    );
    return getNiche(existing.id)!;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_niches
       (id, slug, label, lead_service, seasonality, ticket_band_low, ticket_band_high,
        margin_band_low, margin_band_high, recurring_b2b, notes, is_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.slug,
    input.label,
    input.lead_service ?? null,
    input.seasonality ?? null,
    input.ticket_band_low ?? null,
    input.ticket_band_high ?? null,
    input.margin_band_low ?? null,
    input.margin_band_high ?? null,
    input.recurring_b2b ? 1 : 0,
    input.notes ?? null,
    input.is_seed ? 1 : 0,
  );
  return getNiche(id)!;
}

export function getNiche(id: string): Niche | undefined {
  return db.prepare("SELECT * FROM intel_niches WHERE id = ?").get(id) as Niche | undefined;
}

export function findNiche(slug: string): Niche | undefined {
  return db.prepare("SELECT * FROM intel_niches WHERE slug = ?").get(slug) as Niche | undefined;
}

export function listNiches(): Niche[] {
  return db.prepare("SELECT * FROM intel_niches ORDER BY label").all() as Niche[];
}
