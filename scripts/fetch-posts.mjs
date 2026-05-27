#!/usr/bin/env node
// Calls the local `xreach` CLI to refresh data/_raw_posts.json.
// Requires xreach to be installed and authenticated.
//   npm install -g xreach-cli
//   xreach auth extract --browser chrome

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "_raw_posts.json");

const HANDLE = process.env.X_HANDLE || "aleabitoreddit";
const COUNT = process.env.PAGE_SIZE || "40";
const MAX_PAGES = process.env.MAX_PAGES || "10";

console.log(`xreach tweets ${HANDLE} -n ${COUNT} --all --max-pages ${MAX_PAGES}`);
const r = spawnSync(
  "xreach",
  ["tweets", HANDLE, "-n", COUNT, "--all", "--max-pages", MAX_PAGES, "--json"],
  { encoding: "utf8" }
);
if (r.status !== 0) {
  console.error("xreach failed");
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
fs.writeFileSync(OUT, r.stdout);
const j = JSON.parse(r.stdout);
const items = j.items ?? j;
console.log(
  `wrote ${OUT}  items=${items.length}  range=${items[items.length - 1]?.createdAt} → ${items[0]?.createdAt}`
);
