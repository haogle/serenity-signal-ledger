"use client";

import { useMemo, useState } from "react";
import type { PostsFile, PricesFile } from "@/lib/types";
import { SymbolPill } from "./SymbolPill";
import { TimelineChart } from "./TimelineChart";
import { OpinionTape } from "./OpinionTape";

type Props = {
  postsFile: PostsFile;
  pricesFile: PricesFile;
  initialTicker: string;
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

type Filter = "all" | "priced" | "hot";

export function Dashboard({ postsFile, pricesFile, initialTicker }: Props) {
  const [ticker, setTicker] = useState(initialTicker);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filteredSymbols = useMemo(() => {
    let list = postsFile.symbols;
    if (filter === "priced") {
      list = list.filter((s) => {
        const p = pricesFile.prices[s.ticker];
        return p && !p.error && (p.points?.length ?? 0) > 0;
      });
    } else if (filter === "hot") {
      list = list.filter((s) => s.mentions >= 5);
    }
    const q = search.trim().toUpperCase();
    if (q) list = list.filter((s) => s.ticker.includes(q));
    return list;
  }, [postsFile.symbols, pricesFile.prices, filter, search]);

  const selected = useMemo(
    () => postsFile.symbols.find((s) => s.ticker === ticker)!,
    [postsFile.symbols, ticker]
  );
  const selectedPrice = pricesFile.prices[ticker];

  const tickerPosts = useMemo(
    () => postsFile.posts.filter((p) => p.cashtags.includes(ticker)),
    [postsFile.posts, ticker]
  );

  const firstMention = tickerPosts.length
    ? tickerPosts[tickerPosts.length - 1].createdAt
    : null;
  const lastMention = tickerPosts.length ? tickerPosts[0].createdAt : null;

  const barCount = selectedPrice?.points?.length ?? 0;

  return (
    <div className="relative z-10 mx-auto max-w-[1400px] px-6 sm:px-10 py-10">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div>
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-3">
              X / Aleabitoreddit Intelligence Archive
            </div>
            <h1 className="font-display text-6xl sm:text-7xl leading-[0.85]">
              SERENITY
              <br />
              SIGNAL LEDGER
            </h1>
          </div>

          <div className="max-w-sm rounded-2xl bg-card-strong/80 border border-border p-4 text-sm text-ink-soft leading-relaxed">
            <span className="inline-flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-orange-500" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                Auto pipeline
              </span>
            </span>
            <p>
              自动抓取 <strong>@aleabitoreddit</strong> 的帖子，抽取 cashtag，
              关联 Yahoo 日线价格，并在曲线上标记原帖观点。
            </p>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { v: postsFile.totalPosts, l: "帖子入库" },
            { v: postsFile.totalMentions, l: "symbol 提及" },
            { v: postsFile.uniqueSymbols, l: "唯一 symbol" },
            {
              v: Object.values(pricesFile.prices).filter(
                (p) => !p.error && (p.points?.length ?? 0) > 0
              ).length,
              l: "已下载价格",
            },
            { v: fmtDateTime(postsFile.latestPostAt), l: "最新提及" },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-2xl bg-card-strong/70 border border-border px-5 py-4"
            >
              <div className="font-display text-2xl nums">{k.v}</div>
              <div className="font-mono text-[11px] text-ink-mute mt-1">{k.l}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Main split */}
      <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Symbols rail */}
        <aside className="rounded-3xl bg-card-strong/70 border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base tracking-wider">SYMBOLS</h2>
            <input
              type="text"
              placeholder="搜索 NVDA / TSM …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-canvas/70 border border-border rounded-full px-3 py-1 text-xs font-mono w-40 focus:outline-none focus:ring-2 focus:ring-accent/60"
            />
          </div>

          <div className="flex gap-1.5 mb-3">
            {(["all", "priced", "hot"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-mono transition",
                  filter === f
                    ? "bg-ink text-canvas"
                    : "bg-card-strong/60 hover:bg-card-strong text-ink-soft",
                ].join(" ")}
              >
                {f === "all" ? "全部" : f === "priced" ? "有价格" : "高频"}
              </button>
            ))}
          </div>

          <div className="h-[640px] overflow-y-auto scroll-fade space-y-1.5 pr-1">
            {filteredSymbols.map((s) => (
              <SymbolPill
                key={s.ticker}
                symbol={s}
                price={pricesFile.prices[s.ticker]}
                active={s.ticker === ticker}
                onClick={() => setTicker(s.ticker)}
              />
            ))}
            {filteredSymbols.length === 0 && (
              <div className="text-center text-sm text-ink-mute py-12">
                没有匹配项
              </div>
            )}
          </div>
        </aside>

        {/* Chart panel */}
        <main className="rounded-3xl bg-card-strong/70 border border-border p-6 sm:p-8">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
            <div>
              <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute">
                Price × Mention Timeline
              </div>
              <h3 className="font-display text-4xl mt-1">${ticker}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <KPI label="mentions" value={tickerPosts.length} />
              <KPI label="bars" value={barCount} />
              <KPI
                label="first"
                value={firstMention ? fmtDateTime(firstMention) : "—"}
              />
              <KPI
                label="latest"
                value={lastMention ? fmtDateTime(lastMention) : "—"}
              />
            </div>
          </div>

          <TimelineChart
            ticker={ticker}
            series={selectedPrice}
            posts={tickerPosts}
          />

          {/* Co-mention chips */}
          {selected.coMentions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selected.coMentions.map((cm) => (
                <button
                  key={cm.ticker}
                  onClick={() => setTicker(cm.ticker)}
                  className="rounded-full bg-canvas/80 border border-border px-3 py-1.5 text-xs font-mono hover:bg-accent hover:border-accent-deep transition"
                >
                  <span className="font-bold text-ink">{cm.ticker}</span>
                  <span className="text-ink-mute ml-1.5">x{cm.count}</span>
                </button>
              ))}
            </div>
          )}
        </main>
      </section>

      <OpinionTape posts={postsFile.posts} />

      <footer className="mt-12 mb-4 font-mono text-[11px] text-ink-mute flex flex-wrap gap-4 justify-between">
        <span>
          fetched {fmtDateTime(postsFile.fetchedAt)} · prices{" "}
          {fmtDateTime(pricesFile.fetchedAt)}
        </span>
        <span>
          source · X @aleabitoreddit · price · Yahoo Finance · this is not
          investment advice
        </span>
      </footer>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-full bg-canvas/80 border border-border px-3 py-1.5 text-xs flex items-center gap-2">
      <span className="font-bold text-ink nums">{value}</span>
      <span className="text-ink-mute font-mono">{label}</span>
    </div>
  );
}
