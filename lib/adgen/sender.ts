import { generateBatch } from "./generator";
import { sendAdToDiscord } from "../discord";
import type { Service, AdFormat, Tone } from "./types";

export interface GenerateOptions {
  count?: number;
  service?: Service;
  format?: AdFormat;
  tone?: Tone;
}

export async function generateAndSendAds(
  countOrOptions: number | GenerateOptions = 1
): Promise<void> {
  const opts: GenerateOptions =
    typeof countOrOptions === "number"
      ? { count: countOrOptions }
      : countOrOptions;

  const count = opts.count ?? 1;
  const ads = generateBatch(count, {
    service: opts.service,
    format: opts.format,
    tone: opts.tone,
  });

  console.log(`[ad-gen] Generated ${ads.length} ad(s) — sending to Discord`);

  for (const ad of ads) {
    await sendAdToDiscord(ad);
    console.log(
      `[ad-gen] Sent: ${ad.service} / ${ad.format} / ${ad.tone} → #${ad.channel}`
    );
  }
}
