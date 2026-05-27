"use client";

import type { Symbol, PriceSeries } from "@/lib/types";

type Props = {
  symbol: Symbol;
  price: PriceSeries | undefined;
  active: boolean;
  onClick: () => void;
};

function fmtPrice(p: PriceSeries | undefined) {
  if (!p || p.error || !p.points || p.points.length === 0) return "—";
  const last = p.points[p.points.length - 1].c;
  return `$${last.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export function SymbolPill({ symbol, price, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group w-full text-left rounded-2xl px-4 py-3 transition-all",
        "flex items-center justify-between gap-3",
        active
          ? "bg-accent shadow-[0_8px_30px_-12px_rgba(163,212,40,0.6)]"
          : "bg-card-strong hover:bg-card-strong/90 hover:translate-x-0.5",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-display text-lg leading-none tracking-tight">
          {symbol.ticker}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-ink-soft nums">
            <strong className="text-ink">{symbol.mentions}</strong> mentions
          </span>
          <span className="text-[10px] text-ink-mute nums font-mono">
            latest {fmtDate(symbol.lastSeen)}
          </span>
        </div>
      </div>
      <span className="font-mono text-sm nums text-ink">{fmtPrice(price)}</span>
    </button>
  );
}
