#!/usr/bin/env node
// Reads data/_raw_posts.json (xreach output), normalizes posts, extracts cashtags,
// writes data/posts.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "data", "_raw_posts.json");
const OUT = path.join(ROOT, "data", "posts.json");

const CASHTAG = /\$([A-Z]{1,6})(?=[\b\s.,;:!?)\]'"\/-]|$)/g;
// Words to never treat as tickers — currency suffixes / common false positives.
const STOP = new Set([
  "USD", "USDT", "USDC", "EUR", "GBP", "JPY", "CNY",
  "I", "A", "X", "S", "T", "G", "M", "B", "K",
  "ETF", "ETFS", "OK", "OP", "NEW", "AI",
  "YOLO", "WSB",
]);

function extractCashtags(text) {
  if (!text) return [];
  const out = new Set();
  for (const m of text.matchAll(CASHTAG)) {
    const tag = m[1];
    // skip pure money amounts like $300M -> "M" already filtered by STOP,
    // but also drop where the immediately preceding char is a digit (so "$300M"
    // is never seen — but our regex anchors at "$" so this isn't an issue).
    if (STOP.has(tag)) continue;
    if (tag.length === 1) continue;
    out.add(tag);
  }
  return [...out];
}

const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
const items = raw.items ?? raw;

const posts = items
  .filter(
    (it) =>
      it.text &&
      it.user?.screenName?.toLowerCase() === "aleabitoreddit" &&
      !it.isRetweet
  )
  .map((it) => ({
    id: it.id,
    text: it.text,
    createdAt: new Date(it.createdAt).toISOString(),
    isReply: !!it.isReply,
    isQuote: !!it.isQuote,
    replyCount: it.replyCount ?? 0,
    retweetCount: it.retweetCount ?? 0,
    likeCount: it.likeCount ?? 0,
    viewCount: it.viewCount ?? 0,
    url: `https://x.com/aleabitoreddit/status/${it.id}`,
    cashtags: extractCashtags(it.text),
  }))
  .filter((p) => p.cashtags.length > 0)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// Aggregate per-symbol summary.
const counts = new Map();
const lastSeen = new Map();
const coMentions = new Map(); // symbol -> Map<other, count>
for (const p of posts) {
  for (const t of p.cashtags) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
    if (!lastSeen.has(t) || p.createdAt > lastSeen.get(t)) lastSeen.set(t, p.createdAt);
    for (const o of p.cashtags) {
      if (o === t) continue;
      if (!coMentions.has(t)) coMentions.set(t, new Map());
      const inner = coMentions.get(t);
      inner.set(o, (inner.get(o) ?? 0) + 1);
    }
  }
}

const symbols = [...counts.entries()]
  .map(([ticker, mentions]) => ({
    ticker,
    mentions,
    lastSeen: lastSeen.get(ticker),
    coMentions: [...(coMentions.get(ticker) ?? new Map()).entries()]
      .map(([t, n]) => ({ ticker: t, count: n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  }))
  .sort((a, b) => b.mentions - a.mentions);

const totalMentions = posts.reduce((s, p) => s + p.cashtags.length, 0);
const fetchedAt = new Date().toISOString();
const latestPostAt = posts[0]?.createdAt ?? null;

const payload = {
  fetchedAt,
  account: "aleabitoreddit",
  displayName: "Serenity",
  totalPosts: posts.length,
  totalMentions,
  uniqueSymbols: symbols.length,
  latestPostAt,
  symbols,
  posts,
};

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(
  `wrote ${OUT}  posts=${posts.length}  symbols=${symbols.length}  mentions=${totalMentions}`
);
