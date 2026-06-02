import { generateBatch } from "./generator";
import { sendAdToDiscord, sendSystemAlert } from "../discord";
import { enqueueAd, countPendingPosts } from "./queue";
import type { Service, AdFormat, Tone } from "./types";

const FB_QUEUE_DEPTH_LIMIT = 3;

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

  let queueAlertSent = false;

  for (const ad of ads) {
    if (ad.format === "facebook") {
      const depth = countPendingPosts();
      if (depth >= FB_QUEUE_DEPTH_LIMIT) {
        console.warn(`[ad-gen] Facebook queue full (${depth} pending) — skipping ${ad.id}`);
        if (!queueAlertSent) {
          await sendSystemAlert(
            "Facebook Queue Full — Generation Paused",
            `${depth} posts are pending in the queue (limit: ${FB_QUEUE_DEPTH_LIMIT}). Facebook ad generation is paused until posts are published or cleared.`,
            false
          );
          queueAlertSent = true;
        }
        continue;
      }
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
