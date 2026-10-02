import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import db from "@/lib/db";
import { generateEstimate } from "@/lib/estimate";
import { sendDiscordAlert } from "@/lib/discord";
import { sendLeadConfirmation } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { buildInitialCustomerSMS, buildBrandonAlertSMS, futureISO, serviceLabel } from "@/lib/followup";
import { SUBMITTED_ATTRIBUTION_FIELDS, sanitizeAttribution } from "@/lib/attribution";
import { resolveSourceId } from "@/lib/leadSource";
import {
  ROUTING_SERVICE,
  isValidItemType,
  isValidPickupLocation,
  itemTypeLabel,
  pickupLocationLabel,
} from "@/lib/pickup";
import { sendSlackQuoteAlert } from "@/lib/slack";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Human-readable preferred timing from the date + window fields, for the Slack alert.
function formatPreferredTiming(date: string, window: string): string {
  const windowLabel =
    window === "morning" ? "Morning" : window === "afternoon" ? "Afternoon" : window ? "Flexible" : "";
  if (date && windowLabel) return `${date} (${windowLabel})`;
  if (date) return date;
  if (windowLabel) return windowLabel;
  return "No preference given";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const itemType = formData.get("item_type") as string;
    const pickupLocation = formData.get("pickup_location") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const zip = ((formData.get("zip") as string) ?? "").trim() || null;
    const details = (formData.get("details") as string) ?? "";

    // Pickup/cleanout funnel: a valid item_type is required. Any value outside the
    // pickup/cleanout set is rejected — this funnel is pickup/cleanout only.
    if (!isValidItemType(itemType) || !name || !email || !phone || !address) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    // Every item_type routes through the single CRM service so matching/estimate/
    // follow-ups keep working; granularity is preserved in leads.item_type.
    const service = ROUTING_SERVICE;

    // Optional pickup-detail fields.
    const pickup_location = isValidPickupLocation(pickupLocation) ? pickupLocation : null;
    const items_outside = (formData.get("items_outside") as string) || null;
    const floor_info = (formData.get("floor_info") as string) || null;
    const heavyRaw = (formData.get("heavy_items") as string) || "";
    const heavy_items = heavyRaw === "yes" || heavyRaw === "on" || heavyRaw === "1" ? 1 : 0;
    const occupancy = (formData.get("occupancy") as string) || null;
    const access_info = (formData.get("access_info") as string) || null;
    const carpet_rooms = (formData.get("carpet_rooms") as string) || null;
    const carpet_condition = (formData.get("carpet_condition") as string) || null;
    const preferred_date = (formData.get("preferred_date") as string) || null;
    const preferred_window = (formData.get("preferred_window") as string) || null;

    // Handle photo uploads
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const photos: string[] = [];
    const files = formData.getAll("photos") as File[];

    for (const file of files) {
      if (!file || file.size === 0) continue;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const allowedExts = ["jpg", "jpeg", "png", "webp", "heic"];
      if (!allowedExts.includes(ext)) continue;

      const filename = `${uuidv4()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
      photos.push(`/uploads/${filename}`);
    }

    // Generate internal estimate
    const estimate = generateEstimate({ service, details, photoCount: photos.length });

    // Lead-source attribution (never fails the submission — best-effort).
    const attrRaw: Record<string, unknown> = {};
    for (const k of SUBMITTED_ATTRIBUTION_FIELDS) attrRaw[k] = formData.get(k);
    const attr = sanitizeAttribution(attrRaw);
    const sourceId = resolveSourceId(attr);

    // Persist to SQLite
    const id = uuidv4();
    const nextFollowupAt = futureISO(1); // first follow-up 24h from now
    db.prepare(`
      INSERT INTO leads (
        id, service, name, email, phone, address, zip, details, photos,
        estimate_low, estimate_high, status, quote_status, next_followup_at,
        item_type, pickup_location, items_outside, floor_info, heavy_items,
        occupancy, access_info, carpet_rooms, carpet_condition,
        preferred_date, preferred_window,
        source_page, niche, city,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        referrer_url, source_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'needs_quote', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, service, name, email, phone, address, zip, details, JSON.stringify(photos),
      estimate.low, estimate.high, nextFollowupAt,
      itemType, pickup_location, items_outside, floor_info, heavy_items,
      occupancy, access_info, carpet_rooms, carpet_condition,
      preferred_date, preferred_window,
      attr.source_page ?? null, attr.niche ?? null, attr.city ?? null,
      attr.utm_source ?? null, attr.utm_medium ?? null, attr.utm_campaign ?? null,
      attr.utm_term ?? null, attr.utm_content ?? null,
      attr.referrer ?? null, sourceId,
    );

    // Slack quote-review alert — every request pings admin so a quote can go out fast.
    // Best-effort: never blocks or fails the submission.
    sendSlackQuoteAlert({
      id,
      name,
      phone,
      email,
      address,
      zip,
      itemTypeLabel: itemTypeLabel(itemType),
      pickupLocationLabel: pickup_location ? pickupLocationLabel(pickup_location) : "Not specified",
      preferredTiming: formatPreferredTiming(preferred_date ?? "", preferred_window ?? ""),
      details,
      photoPaths: photos,
    }).catch((err) => console.error("Slack quote alert failed:", err));

    // Non-blocking side effects — none of these can fail the lead submission
    sendDiscordAlert({
      id,
      service,
      name,
      email,
      phone,
      address,
      details,
      photoCount: photos.length,
      estimateLow: estimate.low,
      estimateHigh: estimate.high,
    }).catch((err) => console.error("Discord alert failed:", err));

    sendLeadConfirmation({ name, email, service, address })
      .catch((err) => console.error("Confirmation email failed:", err));

    // Initial SMS to customer + Brandon alert
    const firstName = name.split(" ")[0];
    const svc = serviceLabel(service);
    const BRANDON_PHONE = process.env.BRANDON_PHONE;

    // SMS is a notification side effect — never a prerequisite for recording a
    // lead. sendSMS is fully protected (kill switch, cap, breaker) and never
    // throws; we only advance the lead to CONTACTED when a message truly sent.
    sendSMS({
      to: phone,
      body: buildInitialCustomerSMS(firstName, svc),
      leadId: id,
      subject: "initial_customer",
    })
      .then((result) => {
        if (result.status === "sent") {
          db.prepare(
            `UPDATE leads SET status='CONTACTED', last_contacted_at=datetime('now') WHERE id=? AND status='new'`
          ).run(id);
        }
      })
      .catch((err) => console.error("Initial customer SMS failed:", err));

    if (BRANDON_PHONE) {
      // leadId is passed so the admin alert is logged and counted against the
      // global daily cap — no sender can bypass the central limits.
      sendSMS({
        to: BRANDON_PHONE,
        body: buildBrandonAlertSMS(name, phone, service, address, estimate.low, estimate.high),
        leadId: id,
        subject: "brandon_alert",
      }).catch((err) => console.error("Brandon alert SMS failed:", err));
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Lead submission error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
