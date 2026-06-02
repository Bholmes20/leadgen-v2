/**
 * One-shot test post to the Facebook Page. Bypasses the queue.
 * Run: npx tsx --env-file=.env.local scripts/test-fb-post.ts
 * Delete the post manually from the Page after confirming it works.
 */

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

if (!PAGE_ID || !PAGE_TOKEN) {
  console.error("FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN must be set in .env.local");
  process.exit(1);
}

const message = [
  "Test post from Esee Property Services auto-poster.",
  "If you see this, the Facebook integration is working correctly.",
  "(Safe to delete.)",
].join("\n\n");

async function run() {
  const res = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: PAGE_TOKEN }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("Posted successfully.");
  console.log("FB post ID:", (data as { id: string }).id);
  console.log("Delete it at: https://www.facebook.com/" + PAGE_ID);
}

run().catch((err) => { console.error(err); process.exit(1); });
