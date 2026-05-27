export type Post = {
  id: string;
  text: string;
  createdAt: string;
  isReply: boolean;
  isQuote: boolean;
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  viewCount: number;
  url: string;
  cashtags: string[];
};

export type CoMention = { ticker: string; count: number };

export type Symbol = {
  ticker: string;
  mentions: number;
  lastSeen: string;
  coMentions: CoMention[];
};

export type PostsFile = {
  fetchedAt: string;
  account: string;
  displayName: string;
  totalPosts: number;
  totalMentions: number;
  uniqueSymbols: number;
  latestPostAt: string;
  symbols: Symbol[];
  posts: Post[];
};

export type PricePoint = { d: string; c: number };

export type PriceSeries = {
  ticker?: string;
  currency?: string;
  points?: PricePoint[];
  error?: string;
};

export type PricesFile = {
  fetchedAt: string;
  prices: Record<string, PriceSeries>;
};
