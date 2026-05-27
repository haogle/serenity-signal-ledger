"use client";

import type { Post } from "@/lib/types";

function fmt(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function colorize(text: string) {
  return text.split(/(\$[A-Z]{1,6}\b)/g).map((part, i) =>
    part.startsWith("$") ? (
      <span key={i} className="text-line font-semibold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function OpinionTape({ posts }: { posts: Post[] }) {
  return (
    <section className="mt-10 rounded-3xl bg-card-strong/70 border border-border p-6 sm:p-8 backdrop-blur">
      <header className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-2xl">LATEST OPINION TAPE</h2>
        <span className="font-mono text-xs text-ink-mute">
          {posts.length} 条 · 按时间倒序
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {posts.slice(0, 24).map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-border bg-card-strong/80 p-5 hover:bg-card-strong transition-colors"
          >
            <div className="flex items-baseline gap-2 mb-2">
              {p.cashtags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="font-display text-base text-ink"
                >
                  ${t}
                </span>
              ))}
              <span className="font-mono text-[11px] text-ink-mute ml-1">
                {fmt(p.createdAt)} ·{" "}
                {p.isReply ? "replies" : p.isQuote ? "quote" : "post"}
              </span>
            </div>
            <p className="text-sm text-ink-soft leading-relaxed line-clamp-4">
              {colorize(p.text)}
            </p>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-line hover:text-ink underline underline-offset-2"
            >
              open on X →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
