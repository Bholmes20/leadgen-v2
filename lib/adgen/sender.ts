import { generateBatch } from "./generator";
import { sendAdToDiscord } from "../discord";
import { enqueueAd } from "./queue";
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

  console.log(`[ad-gen] Generated ${ads.length} ad(s)`);

  for (const ad of ads) {
    if (ad.format === "facebook") {
      const queued = enqueueAd(ad);
      console.log(
        queued
          ? `[ad-gen] Queued for Facebook: ${ad.id} (${ad.service} / ${ad.tone})`
          : `[ad-gen] Duplicate skipped: ${ad.id}`
      );
    } else {
      await sendAdToDiscord(ad);
      console.log(
        `[ad-gen] Sent to Discord: ${ad.service} / ${ad.format} / ${ad.tone} → #${ad.channel}`
      );
    }
  }
}
