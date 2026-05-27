#!/usr/bin/env node
// Pulls daily closes from Yahoo Finance for every cashtag in data/posts.json
// via the yahoo-finance2 lib (handles crumb/cookie auth).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
yahooFinance.setGlobalConfig?.({ notifyRipHistorical: false });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = path.join(ROOT, "data", "posts.json");
const OUT = path.join(ROOT, "data", "prices.json");

const DELAY_MS = 150;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const now = new Date();
const period1 = new Date(now);
period1.setMonth(period1.getMonth() - 6);

// Known mappings where a cashtag refers to a non-US listing.
const ALIASES = {
  SIVE: "SIVE.ST",  // Sivers Semiconductors (Stockholm)
  IQE: "IQE.L",      // IQE plc (London)
  XFAB: "XFAB.PA",   // X-FAB Silicon Foundries (Paris)
  ABB: "ABBN.SW",    // ABB Ltd (Swiss)
  CATL: "300750.SZ", // CATL (Shenzhen)
  UHR: "UHR.SW",     // Swatch (Swiss)
};

async function fetchSymbol(sym) {
  const rows = await yahooFinance.chart(sym, {
    period1,
    period2: now,
    interval: "1d",
  });
  const points = (rows.quotes ?? [])
    .filter((q) => q.close != null && q.date)
    .map((q) => ({
      d: new Date(q.date).toISOString().slice(0, 10),
      c: Number(q.close.toFixed(2)),
    }));
  if (points.length === 0) throw new Error("no points");
  return { points, currency: rows.meta?.currency ?? "USD" };
}

async function fetchOne(ticker) {
  const candidates = [
    ALIASES[ticker],
    ticker,
    `${ticker}.L`,
    `${ticker}.ST`,
    `${ticker}.AS`,
    `${ticker}.PA`,
    `${ticker}.HK`,
    `${ticker}.TO`,
  ].filter(Boolean);
  let lastErr;
  for (const sym of candidates) {
    try {
      const { points, currency } = await fetchSymbol(sym);
      return { ticker, resolvedAs: sym, currency, points };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("all candidates failed");
}

const { symbols } = JSON.parse(fs.readFileSync(POSTS, "utf8"));
const tickers = symbols.map((s) => s.ticker);
console.log(`fetching ${tickers.length} tickers from Yahoo Finance...`);

const out = {};
let ok = 0;
let failed = 0;
for (const t of tickers) {
  try {
    const data = await fetchOne(t);
    if (data.points.length === 0) {
      out[t] = { error: "no data" };
      failed++;
    } else {
      out[t] = data;
      ok++;
    }
  } catch (e) {
    out[t] = { error: String(e.message || e) };
    failed++;
  }
  process.stdout.write(`\r  ${ok + failed}/${tickers.length}  ok=${ok}  fail=${failed}`);
  await sleep(DELAY_MS);
}
console.log("");

fs.writeFileSync(
  OUT,
  JSON.stringify({ fetchedAt: new Date().toISOString(), prices: out }, null, 2)
);
console.log(`wrote ${OUT}  ok=${ok}  fail=${failed}`);
