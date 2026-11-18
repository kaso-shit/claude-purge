// probe-cc-armor.mjs — Claude Code 系统提示装甲句定位
import fs from "node:fs";

const f = process.argv[2];
const buf = fs.readFileSync(f);
const needles = [
  "You are Claude Code, Anthropic's official CLI for Claude",
  "Assist with authorized security testing",
  "Refuse requests for destructive techniques",
  "detection evasion for malicious purposes",
  "Do not use emojis",
  "Avoid using emojis",
  "IMPORTANT: Assist with defensive security",
  "malicious",
  "detection evasion",
  "supply chain compromise",
  "mass targeting",
];
for (const n of needles) {
  const b = Buffer.from(n, "utf8");
  const hits = [];
  let i = -1;
  while ((i = buf.indexOf(b, i + 1)) !== -1 && hits.length < 4) hits.push(i);
  console.log(`${hits.length ? "HIT " : "miss"} ${JSON.stringify(n).slice(0, 70)} ${hits.join(",")}`);
}
