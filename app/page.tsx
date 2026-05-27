import { Dashboard } from "@/components/Dashboard";
import { posts, prices, defaultSymbol } from "@/lib/data";

export default function Home() {
  return (
    <Dashboard
      postsFile={posts}
      pricesFile={prices}
      initialTicker={defaultSymbol()}
    />
  );
}
