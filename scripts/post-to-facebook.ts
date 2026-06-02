/**
 * Reads approved pending posts from SQLite and publishes them to the Facebook
 * Page feed via the Graph API.
 *
 * Run on a schedule (e.g. every 6–8 hours):
 *   npx tsx --env-file=.env.local scripts/post-to-facebook.ts
 *
 * To reject a queued post before it goes live:
 *   npx tsx --env-file=.env.local scripts/post-to-facebook.ts reject <post-id>
 *
 * Required env vars:
 *   FB_PAGE_ID              — numeric Page ID
 *   FB_PAGE_ACCESS_TOKEN    — long-lived Page access token
 *   FB_APPROVE_DELAY_HOURS  — hours to wait before auto-posting (default: 2)
 *   FB_SITE_URL             — appended to every post (e.g. https://leads.eseeeent.com)
 */

import { getEligiblePosts, markPosted, markFailed, rejectPost, countRecentFailures } from "../lib/adgen/queue";
import { sendSystemAlert } from "../lib/discord";

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const DELAY_HOURS = parseInt(process.env.FB_APPROVE_DELAY_HOURS ?? "2", 10);
const SITE_URL = process.env.FB_SITE_URL ?? "";

// ── Reject mode ──────────────────────────────────────────────────────────────

if (process.argv[2] === "reject") {
  const id = process.argv[3];
  if (!id) {
    console.error("Usage: post-to-facebook.ts reject <post-id>");
    process.exit(1);
  }
  rejectPost(id);
  console.log(`[fb-poster] Rejected post ${id}`);
  process.exit(0);
}

// ── Post mode ────────────────────────────────────────────────────────────────

if (!PAGE_ID || !PAGE_TOKEN) {
  console.error("[fb-poster] FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are required");
  process.exit(1);
}

function buildMessage(post: {
  headline: string;
  body: string;
  cta: string;
}): string {
  const parts: string[] = [];
  parts.push(post.headline);
  if (post.body) parts.push(post.body);
  parts.push(`👉 ${post.cta}`);
  if (SITE_URL) parts.push(SITE_URL);
  return parts.join("\n\n");
}

async function postToPage(message: string): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: PAGE_TOKEN }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const FAILURE_WINDOW_HOURS = 72;
const FAILURE_PAUSE_THRESHOLD = 3;

async function run(): Promise<void> {
  const recentFailures = countRecentFailures(FAILURE_WINDOW_HOURS);
  if (recentFailures >= FAILURE_PAUSE_THRESHOLD) {
    const msg = `${recentFailures} post failures in the last ${FAILURE_WINDOW_HOURS}h. Posting paused — check token and logs.`;
    console.error(`[fb-poster] ${msg}`);
    await sendSystemAlert("Facebook Posting Paused", msg, true);
    return;
  }

  const posts = getEligiblePosts(DELAY_HOURS);

  if (posts.length === 0) {
    console.log(`[fb-poster] No posts eligible yet (delay: ${DELAY_HOURS}h)`);
    return;
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(
      `[fb-poster] Posting ${post.id} — ${post.service} / ${post.tone}`
    );

    try {
      const message = buildMessage(post);
      const fbId = await postToPage(message);
      markPosted(post.id, fbId);
      console.log(`[fb-poster] Posted — FB id: ${fbId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      markFailed(post.id, msg);
      console.error(`[fb-poster] Failed: ${msg}`);
      await sendSystemAlert(
        "Facebook Post Failed",
        `Post \`${post.id}\` (${post.service} / ${post.tone}) failed:\n\`\`\`${msg}\`\`\``,
        true
      );
    }

    if (i < posts.length - 1) {
      const delay = 45_000 + Math.random() * 45_000;
      console.log(`[fb-poster] Waiting ${Math.round(delay / 1000)}s before next post...`);
      await sleep(delay);
    }
  }
}

run().catch(async (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[fb-poster] Fatal:", msg);
  await sendSystemAlert("Facebook Poster Fatal Error", msg, true).catch(() => {});
  process.exit(1);
});
