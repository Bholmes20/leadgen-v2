// Market repository — the research universe of cities we might enter.
// Worker-ready: pure functions over the DB, no UI coupling.

import db from "../db";
import { v4 as uuidv4 } from "uuid";
import type { Market } from "./types";

export interface MarketInput {
  city: string;
  state: string;
  metro?: string | null;
  county?: string | null;
  population?: number | null;
  context?: string | null;
  seo_city_slug?: string | null;
  is_seed?: boolean;
}

/**
 * Insert or update a market by its natural key (city, state). Returns the row.
 * Idempotent — safe to call repeatedly when seeding or re-importing research.
 */
export function upsertMarket(input: MarketInput): Market {
  const existing = findMarket(input.city, input.state);
  if (existing) {
    db.prepare(
      `UPDATE intel_markets
         SET metro = COALESCE(?, metro),
             county = COALESCE(?, county),
             population = COALESCE(?, population),
             context = COALESCE(?, context),
             seo_city_slug = COALESCE(?, seo_city_slug)
       WHERE id = ?`,
    ).run(
      input.metro ?? null,
      input.county ?? null,
      input.population ?? null,
      input.context ?? null,
      input.seo_city_slug ?? null,
      existing.id,
    );
    return getMarket(existing.id)!;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO intel_markets
       (id, city, state, metro, county, population, context, seo_city_slug, is_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.city,
    input.state,
    input.metro ?? null,
    input.county ?? null,
    input.population ?? null,
    input.context ?? null,
    input.seo_city_slug ?? null,
    input.is_seed ? 1 : 0,
  );
  return getMarket(id)!;
}

export function getMarket(id: string): Market | undefined {
  return db.prepare("SELECT * FROM intel_markets WHERE id = ?").get(id) as Market | undefined;
}

export function findMarket(city: string, state: string): Market | undefined {
  return db
    .prepare("SELECT * FROM intel_markets WHERE city = ? AND state = ?")
    .get(city, state) as Market | undefined;
}

export function listMarkets(): Market[] {
  return db.prepare("SELECT * FROM intel_markets ORDER BY state, city").all() as Market[];
}
