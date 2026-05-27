import postsJson from "@/data/posts.json";
import pricesJson from "@/data/prices.json";
import type { PostsFile, PricesFile } from "./types";

export const posts = postsJson as PostsFile;
export const prices = pricesJson as PricesFile;

export function priceFor(ticker: string) {
  return prices.prices[ticker];
}

export function defaultSymbol(): string {
  // Pick the symbol with the highest mention count that we actually have prices for.
  for (const s of posts.symbols) {
    const p = prices.prices[s.ticker];
    if (p && !p.error && p.points && p.points.length > 0) return s.ticker;
  }
  return posts.symbols[0]?.ticker ?? "SIVE";
}
