/**
 * Manually rejects all pending Facebook posts in the queue.
 * Use after an outage to clear stale content before resuming.
 *
 * Requires explicit confirmation to prevent accidental runs:
 *   npx tsx --env-file=.env.local scripts/fb-drain.ts --confirm
 *
 * Posts are marked 'rejected' (not deleted) — history is preserved.
 * Only 'pending' posts are affected; posted/failed/rejected rows are untouched.
 */

import { drainPendingPosts, countPendingPosts } from "../lib/adgen/queue";
import { sendSystemAlert } from "../lib/discord";

if (!process.argv.includes("--confirm")) {
  console.error("[fb-drain] Requires --confirm flag to prevent accidental drains.");
  console.error("           Run: npm run fb:drain -- --confirm");
  process.exit(1);
}

async function run() {
  const before = countPendingPosts();

  if (before === 0) {
    console.log("[fb-drain] Queue is already empty — nothing to drain.");
    return;
  }

  const drained = drainPendingPosts();
  console.log(`[fb-drain] Drained ${drained} pending post(s) — marked as rejected.`);

  await sendSystemAlert(
    "Facebook Queue Drained",
    `${drained} pending post(s) were manually rejected and cleared from the queue. Fresh content will generate on the next scheduled run.`,
    false
  );
}

run().catch((err) => { console.error("[fb-drain] Fatal:", err); process.exit(1); });
