import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import db from "@/lib/db";
import { generateEstimate, Service } from "@/lib/estimate";
import { sendDiscordAlert } from "@/lib/discord";
import { sendLeadConfirmation } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { buildInitialCustomerSMS, buildBrandonAlertSMS, futureISO, serviceLabel } from "@/lib/followup";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const service = formData.get("service") as Service;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const details = (formData.get("details") as string) ?? "";

    if (!service || !name || !email || !phone || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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

    // Persist to SQLite
    const id = uuidv4();
    const nextFollowupAt = futureISO(1); // first follow-up 24h from now
    db.prepare(`
      INSERT INTO leads (id, service, name, email, phone, address, details, photos, estimate_low, estimate_high, status, next_followup_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `).run(id, service, name, email, phone, address, details, JSON.stringify(photos), estimate.low, estimate.high, nextFollowupAt);

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

    sendSMS({
      to: phone,
      body: buildInitialCustomerSMS(firstName, svc),
      leadId: id,
      subject: "initial_customer",
    })
      .then(() => {
        db.prepare(
          `UPDATE leads SET status='CONTACTED', last_contacted_at=datetime('now') WHERE id=? AND status='new'`
        ).run(id);
      })
      .catch((err) => console.error("Initial customer SMS failed:", err));

    if (BRANDON_PHONE) {
      sendSMS({
        to: BRANDON_PHONE,
        body: buildBrandonAlertSMS(name, phone, service, address),
        subject: "brandon_alert",
      }).catch((err) => console.error("Brandon alert SMS failed:", err));
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Lead submission error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
