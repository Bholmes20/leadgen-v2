import { NextRequest, NextResponse } from "next/server";
import { generateAndSendAds } from "@/lib/adgen/sender";
import type { Service, AdFormat, Tone } from "@/lib/adgen/types";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let count = 1;
  let service: Service | undefined;
  let format: AdFormat | undefined;
  let tone: Tone | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.count === "number") count = Math.min(body.count, 10);
    if (body.service) service = body.service as Service;
    if (body.format) format = body.format as AdFormat;
    if (body.tone) tone = body.tone as Tone;
  } catch {
    // use defaults
  }

  try {
    await generateAndSendAds({ count, service, format, tone });
    return NextResponse.json({ success: true, count });
  } catch (err) {
    console.error("[ad-gen] Route handler error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
