#!/usr/bin/env node
// Pulls tweets from a user via Apify's kaitoeasyapi twitter scraper.
// Uses overlapping date windows to defeat X's search lookback cap, then
// dedupes by tweet id and writes data/_raw_posts.json in the xreach-
// compatible shape that extract-posts.mjs expects.
//
// env:
//   APIFY_TOKEN   required
//   X_HANDLE      default "aleabitoreddit"
//   SINCE         default 24 months ago (YYYY-MM-DD)
//   UNTIL         default today (YYYY-MM-DD)
//   WINDOW_DAYS   default 90 — width of each date window
//   MAX_PER_WIN   default 5000 — actor's per-run cap
//
// cost: ~$0.00025 per tweet on FREE plan.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
  console.error("set APIFY_TOKEN env var");
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "_raw_posts.json");

const HANDLE = process.env.X_HANDLE || "aleabitoreddit";
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS || 90);
const MAX_PER_WIN = Number(process.env.MAX_PER_WIN || 5000);
const today = new Date();
const dfltSince = new Date(today);
dfltSince.setMonth(dfltSince.getMonth() - 24);
const SINCE = process.env.SINCE || dfltSince.toISOString().slice(0, 10);
const UNTIL = process.env.UNTIL || today.toISOString().slice(0, 10);

const ACTOR = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest";
const API = "https://api.apify.com/v2";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function windows() {
  const out = [];
  const start = new Date(SINCE);
  const end = new Date(UNTIL);
  for (let cur = new Date(start); cur < end; ) {
    const next = new Date(cur);
    next.setDate(next.getDate() + WINDOW_DAYS);
    out.push({ since: isoDay(cur), until: isoDay(next > end ? end : next) });
    cur = next;
  }
  return out;
}

async function startRun({ since, until }) {
  const body = {
    from: HANDLE,
    queryType: "Latest",
    since,
    until,
    maxItems: MAX_PER_WIN,
  };
  const r = await fetch(`${API}/acts/${ACTOR}/runs?token=${TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`startRun HTTP ${r.status}`);
  return (await r.json()).data;
}

async function waitRun(id) {
  while (true) {
    await sleep(8000);
    const r = await fetch(`${API}/actor-runs/${id}?token=${TOKEN}`);
    const d = (await r.json()).data;
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(d.status)) {
      return d;
    }
  }
}

async function dataset(id) {
  const r = await fetch(
    `${API}/datasets/${id}/items?format=json&token=${TOKEN}`
  );
  if (!r.ok) throw new Error(`dataset HTTP ${r.status}`);
  return r.json();
}

const wins = windows();
console.log(
  `${HANDLE}: ${wins.length} windows (${SINCE} → ${UNTIL}, ${WINDOW_DAYS}d each)`
);

const seen = new Map();
let totalCharge = 0;

for (const w of wins) {
  console.log(`  window ${w.since} → ${w.until}`);
  const run = await startRun(w);
  const final = await waitRun(run.id);
  if (final.status !== "SUCCEEDED") {
    console.warn(`    ! ${final.status}: ${final.statusMessage ?? ""}`);
    continue;
  }
  totalCharge += final.usage?.totalUsd ?? 0;
  const items = await dataset(final.defaultDatasetId);
  let added = 0;
  for (const it of items) {
    if (it.type === "mock_tweet" || !it.id || !it.text) continue;
    if (!seen.has(String(it.id))) {
      seen.set(String(it.id), it);
      added++;
    }
  }
  console.log(`    got ${items.length}  new ${added}  total unique ${seen.size}`);
}

// Normalize to xreach shape consumed by extract-posts.mjs
const items = [...seen.values()]
  .map((it) => ({
    id: String(it.id),
    text: it.text,
    createdAt: it.createdAt,
    user: {
      screenName: it.author?.userName ?? "",
      name: it.author?.name ?? "",
    },
    isReply: !!it.isReply,
    isQuote: !!it.isQuote,
    isRetweet: !!it.retweeted_tweet,
    replyCount: it.replyCount ?? 0,
    retweetCount: it.retweetCount ?? 0,
    likeCount: it.likeCount ?? 0,
    viewCount: it.viewCount ?? 0,
    quoteCount: it.quoteCount ?? 0,
  }))
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

fs.writeFileSync(OUT, JSON.stringify({ items }, null, 0));
console.log(
  `wrote ${OUT}  items=${items.length}  charge≈$${totalCharge.toFixed(2)}`
);
