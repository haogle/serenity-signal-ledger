# Serenity Signal Ledger

A clone of the "Serenity Signal Ledger" — overlays X cashtag mentions on Yahoo
Finance daily prices. Tracks **@aleabitoreddit** (display name: *Serenity*).

## How it works

```
Apify (kaitoeasyapi)─►  data/_raw_posts.json   (multi-window, dedup'd)
       │
       ▼
extract-posts.mjs   ──►  data/posts.json    (normalized + cashtags)
       │
       ▼
fetch-prices.mjs    ──►  data/prices.json   (Yahoo daily closes)
       │
       ▼
Next.js (Vercel)    ──►  reads both JSONs at build, renders dashboard
```

The Vercel deployment serves a **frozen snapshot** of whatever JSON is in `data/`.
To refresh, run the pipeline locally and commit; Vercel redeploys automatically.

## Setup

```bash
npm install

# one-time: get an Apify API token at https://console.apify.com/account/integrations
export APIFY_TOKEN=apify_api_xxx

# pull data (≈ 5-10 minutes, ~$0.001 per tweet on Apify FREE plan)
npm run refresh

# local dev
npm run dev
# open http://localhost:3000
```

### Tracking a different X account

```bash
X_HANDLE=other_account npm run refresh
```

## Deploy to Vercel

```bash
# from this directory, after `git init && git add -A && git commit -m "init"`:
git remote add origin <your-github-repo>
git push -u origin main
```

Then in the Vercel dashboard:

1. **New Project** → import the repo
2. Framework auto-detected as Next.js — no config needed
3. **Root Directory**: `serenity-clone` if you imported the parent repo,
   otherwise leave default
4. Deploy

Subsequent refreshes:

```bash
npm run refresh
git commit -am "refresh $(date +%F)"
git push        # Vercel auto-deploys
```

## Project layout

```
serenity-clone/
├── app/
│   ├── layout.tsx              fonts, body, global CSS variables
│   ├── globals.css             Tailwind 4 + theme tokens
│   └── page.tsx                server component, hands data to <Dashboard>
├── components/
│   ├── Dashboard.tsx           client wrapper, state for selected ticker
│   ├── SymbolPill.tsx          left-rail symbol button
│   ├── TimelineChart.tsx       Recharts area + mention scatter
│   └── OpinionTape.tsx         post grid at the bottom
├── lib/
│   ├── types.ts                shared types
│   └── data.ts                 imports JSON, default-symbol picker
├── scripts/
│   ├── fetch-posts.mjs         xreach → data/_raw_posts.json
│   ├── extract-posts.mjs       → data/posts.json + symbol stats
│   └── fetch-prices.mjs        Yahoo → data/prices.json (with .ST/.L fallback)
└── data/
    ├── _raw_posts.json         xreach raw output (not consumed by app)
    ├── posts.json              normalized + cashtag-tagged
    └── prices.json             daily closes per ticker
```

## Notes & limitations

- **X data**: pulled via Apify's `kaitoeasyapi` Twitter scraper. X's advanced
  search has an effective lookback of ~8 months, so the script walks the
  history in 90-day windows and dedupes by tweet id. For a 2-year window of
  one account with ~6000 tweets, total cost ≈ **$1.50 on Apify's FREE plan**.
- **Yahoo Finance**: `yahoo-finance2` handles the crumb cookie dance. About
  6–10 cashtags fail to resolve (legit non-tickers like `$INC`, or thinly
  listed names). Foreign-listed names (`$SIVE` → Stockholm, `$IQE` → London)
  resolve via the `ALIASES` map plus exchange-suffix fallback in
  `scripts/fetch-prices.mjs`.
- **Static snapshot**: there is no live API in production. To make it truly
  realtime, add Vercel Cron + replace `xreach` with a hosted X API.
- **Not investment advice.**
