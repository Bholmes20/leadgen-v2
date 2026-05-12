import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import db from "@/lib/db";
import { generateEstimate, Service } from "@/lib/estimate";
import { sendDiscordAlert } from "@/lib/discord";

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
    db.prepare(`
      INSERT INTO leads (id, service, name, email, phone, address, details, photos, estimate_low, estimate_high, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `).run(id, service, name, email, phone, address, details, JSON.stringify(photos), estimate.low, estimate.high);

    // Send Discord alert (non-blocking — don't fail the request if Discord is down)
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

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Lead submission error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
