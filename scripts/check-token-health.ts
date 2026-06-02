/**
 * Checks the Facebook Page token expiry via debug_token and alerts Discord
 * if it expires within WARN_DAYS days or is already invalid.
 *
 * Run daily via cron:
 *   npx tsx --env-file=.env.local scripts/check-token-health.ts
 */

import { sendSystemAlert } from "../lib/discord";

const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const WARN_DAYS = 7;

if (!PAGE_TOKEN) {
  console.error("[token-health] FB_PAGE_ACCESS_TOKEN not set");
  process.exit(1);
}

async function run(): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/debug_token?input_token=${PAGE_TOKEN}&access_token=${PAGE_TOKEN}`
  );

  const json = (await res.json()) as {
    data?: {
      is_valid: boolean;
      expires_at: number;
      scopes: string[];
    };
    error?: { message: string };
  };

  if (!res.ok || json.error || !json.data) {
    const msg = json.error?.message ?? "Could not reach debug_token endpoint";
    console.error("[token-health] Token check failed:", msg);
    await sendSystemAlert("Facebook Token Check Failed", msg, true);
    return;
  }

  const { is_valid, expires_at, scopes } = json.data;

  if (!is_valid) {
    console.error("[token-health] Token is invalid");
    await sendSystemAlert(
      "Facebook Token Invalid",
      "The Page access token is no longer valid. Posting is broken — regenerate the token and update FB_PAGE_ACCESS_TOKEN in .env.local.",
      true
    );
    return;
  }

  if (expires_at === 0) {
    console.log("[token-health] Token is permanent (never expires). OK.");
    return;
  }

  const expiresMs = expires_at * 1000;
  const daysLeft = Math.floor((expiresMs - Date.now()) / 86_400_000);

  if (daysLeft <= WARN_DAYS) {
    const msg = `Page access token expires in **${daysLeft} day(s)**. Regenerate it now and update FB_PAGE_ACCESS_TOKEN in .env.local before posting stops.`;
    console.warn("[token-health]", msg);
    await sendSystemAlert("Facebook Token Expiring Soon", msg, false);
  } else {
    console.log(`[token-health] Token healthy — ${daysLeft} days remaining. Scopes: ${scopes.join(", ")}`);
  }
}

run().catch(async (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[token-health] Fatal:", msg);
  await sendSystemAlert("Facebook Token Health Check Error", msg, true).catch(() => {});
  process.exit(1);
});
