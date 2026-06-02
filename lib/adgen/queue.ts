import { createHash } from "crypto";
import db from "../db";
import type { GeneratedAd } from "./types";

interface PendingPost {
  id: string;
  service: string;
  format: string;
  tone: string;
  headline: string;
  body: string;
  cta: string;
  full_text: string;
  content_hash: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  posted_at: string | null;
  fb_post_id: string | null;
  error: string | null;
}

export function enqueueAd(ad: GeneratedAd): boolean {
  const hash = createHash("sha256")
    .update(ad.headline + "\0" + ad.body + "\0" + ad.cta)
    .digest("hex");

  const existing = db
    .prepare("SELECT id FROM pending_posts WHERE content_hash = ?")
    .get(hash);

  if (existing) {
    console.log(`[queue] Duplicate skipped (${hash.slice(0, 8)})`);
    return false;
  }

  db.prepare(
    `INSERT INTO pending_posts (id, service, format, tone, headline, body, cta, full_text, content_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(ad.id, ad.service, ad.format, ad.tone, ad.headline, ad.body, ad.cta, ad.fullText, hash);

  return true;
}

export function getEligiblePosts(delayHours: number): PendingPost[] {
  return db
    .prepare(
      `SELECT * FROM pending_posts
       WHERE status = 'pending'
         AND created_at <= datetime('now', '-' || ? || ' hours')
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .all(delayHours) as PendingPost[];
}

export function markPosted(id: string, fbPostId: string): void {
  db.prepare(
    `UPDATE pending_posts
     SET status = 'posted', posted_at = datetime('now'), fb_post_id = ?
     WHERE id = ?`
  ).run(fbPostId, id);
}

export function markFailed(id: string, error: string): void {
  db.prepare(
    `UPDATE pending_posts SET status = 'failed', error = ? WHERE id = ?`
  ).run(error, id);
}

export function rejectPost(id: string): void {
  db.prepare(
    `UPDATE pending_posts SET status = 'rejected' WHERE id = ? AND status = 'pending'`
  ).run(id);
}
