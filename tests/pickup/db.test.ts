import "./_setup"; // MUST be first — sets LEADS_DB_PATH before lib/db loads
import { test } from "node:test";
import assert from "node:assert/strict";
import { v4 as uuidv4 } from "uuid";
import db from "../../lib/db";

// The additive migration must add the pickup/quote columns without destroying the
// existing leads table. This inserts a lead using the new columns and reads it back.

test("new pickup + quote fields round-trip through the leads table", () => {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO leads (
      id, service, name, email, phone, address, zip, details,
      item_type, pickup_location, items_outside, floor_info, heavy_items,
      occupancy, access_info, carpet_rooms, carpet_condition,
      preferred_date, preferred_window, quote_status
    ) VALUES (?, 'junk-removal', 'Jane Smith', 'jane@example.com', '706-555-0100',
      '123 Canterbury Farms Dr', '30813', 'Mattress at curb',
      'mattress-pickup', 'curbside', 'yes', '', 1,
      NULL, NULL, NULL, NULL,
      '2026-10-10', 'morning', 'needs_quote')
  `).run(id);

  const row = db.prepare(`
    SELECT service, item_type, pickup_location, items_outside, heavy_items,
           preferred_date, preferred_window, quote_status, payment_status,
           quote_amount
    FROM leads WHERE id = ?
  `).get(id) as Record<string, unknown>;

  assert.equal(row.service, "junk-removal");
  assert.equal(row.item_type, "mattress-pickup");
  assert.equal(row.pickup_location, "curbside");
  assert.equal(row.items_outside, "yes");
  assert.equal(row.heavy_items, 1);
  assert.equal(row.preferred_date, "2026-10-10");
  assert.equal(row.preferred_window, "morning");
  assert.equal(row.quote_status, "needs_quote");
  assert.equal(row.payment_status, "none"); // column default applied
  assert.equal(row.quote_amount, null);
});

test("quote_status defaults to 'submitted' when not provided", () => {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO leads (id, service, name, email, phone, address)
    VALUES (?, 'junk-removal', 'Bob', 'bob@example.com', '706-555-0200', '1 Main St')
  `).run(id);
  const row = db.prepare("SELECT quote_status, heavy_items FROM leads WHERE id = ?").get(id) as {
    quote_status: string;
    heavy_items: number;
  };
  assert.equal(row.quote_status, "submitted");
  assert.equal(row.heavy_items, 0); // NOT NULL DEFAULT 0
});

test("saved quote amounts persist as integer cents", () => {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO leads (id, service, name, email, phone, address, item_type)
    VALUES (?, 'junk-removal', 'Q', 'q@example.com', '706-555-0300', '2 Main St', 'furniture-pickup')
  `).run(id);
  db.prepare(`
    UPDATE leads SET quote_amount = ?, deposit_amount = ?, quote_notes = ?, quote_status = 'quoted' WHERE id = ?
  `).run(18500, 5000, "Couch + loveseat, curbside", id);

  const row = db.prepare("SELECT quote_amount, deposit_amount, quote_notes, quote_status FROM leads WHERE id = ?").get(id) as Record<string, unknown>;
  assert.equal(row.quote_amount, 18500);
  assert.equal(row.deposit_amount, 5000);
  assert.equal(row.quote_notes, "Couch + loveseat, curbside");
  assert.equal(row.quote_status, "quoted");
});
