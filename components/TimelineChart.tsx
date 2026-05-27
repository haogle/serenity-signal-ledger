"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Post, PriceSeries } from "@/lib/types";
import { useMemo } from "react";

type Props = {
  ticker: string;
  series: PriceSeries | undefined;
  posts: Post[];
};

function toDayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function TimelineChart({ ticker, series, posts }: Props) {
  const data = useMemo(() => {
    if (!series || series.error || !series.points) return [];
    // Map date -> {price, count}
    const map = new Map<
      string,
      { d: string; t: number; price: number; mention?: number; count: number; posts: Post[] }
    >();
    for (const p of series.points) {
      map.set(p.d, {
        d: p.d,
        t: new Date(p.d).getTime(),
        price: p.c,
        count: 0,
        posts: [],
      });
    }
    // Pin each post to nearest available trading day on/after its date.
    const sortedDays = [...map.keys()].sort();
    for (const post of posts) {
      const key = toDayKey(post.createdAt);
      // first day >= key
      let target = key;
      if (!map.has(target)) {
        const idx = sortedDays.findIndex((d) => d >= key);
        if (idx === -1) target = sortedDays[sortedDays.length - 1];
        else target = sortedDays[idx];
      }
      const row = map.get(target);
      if (row) {
        row.count += 1;
        row.posts.push(post);
        row.mention = row.price;
      }
    }
    return [...map.values()].sort((a, b) => a.t - b.t);
  }, [series, posts]);

  if (!series || series.error || !series.points || series.points.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl bg-card text-ink-mute">
        <span className="font-mono text-sm">
          ${ticker} — no Yahoo price ({series?.error ?? "missing"})
        </span>
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 32, bottom: 20, left: 12 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f3d2a" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#1f3d2a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(21,20,14,0.08)" vertical={false} />
          <XAxis
            dataKey="d"
            tick={{ fill: "#7a755f", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(21,20,14,0.15)" }}
            minTickGap={48}
          />
          <YAxis
            tick={{ fill: "#7a755f", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => `$${v}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            cursor={{ stroke: "rgba(21,20,14,0.2)", strokeDasharray: "2 4" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = payload[0].payload as {
                d: string;
                price: number;
                count: number;
                posts: Post[];
              };
              return (
                <div className="rounded-xl border border-border bg-canvas/95 px-3 py-2 shadow-xl backdrop-blur max-w-xs">
                  <div className="font-mono text-[11px] text-ink-mute">{row.d}</div>
                  <div className="font-display text-xl nums">
                    ${row.price.toFixed(2)}
                  </div>
                  {row.count > 0 && (
                    <div className="mt-1 text-xs text-ink-soft">
                      <span className="font-bold text-ink">{row.count}</span>{" "}
                      mention{row.count === 1 ? "" : "s"}
                    </div>
                  )}
                  {row.posts.slice(0, 1).map((p) => (
                    <div
                      key={p.id}
                      className="mt-1 text-[11px] text-ink-soft line-clamp-2"
                    >
                      "{p.text.slice(0, 90)}…"
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#1f3d2a"
            strokeWidth={2}
            fill="url(#priceFill)"
            isAnimationActive={false}
          />
          <Scatter
            dataKey="mention"
            fill="#e87b3a"
            stroke="#15140e"
            strokeWidth={1}
            isAnimationActive={false}
            r={5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
