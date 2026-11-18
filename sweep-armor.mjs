// sweep-armor.mjs — 全量扫 CLI exe 里残留的拒答/限制类字符串
import fs from "node:fs";

const f = process.argv[2];
const buf = fs.readFileSync(f);
const needles = [
  "malicious code",
  "work on malicious",
  "refuse",
  "Refuse",
  "decline",
  "harmful",
  "detection evasion",
  "weapons",
  "illegal",
  "not able to help",
  "can't help with",
  "cannot help with",
  "I can't",
  "I cannot",
  "won't be able to",
  "unable to assist",
  "IMPORTANT:",
  "Never assist",
  "do not assist",
  "Avoid providing",
  "safety",
];
for (const n of needles) {
  const b = Buffer.from(n, "utf8");
  const hits = [];
  let i = -1;
  while ((i = buf.indexOf(b, i + 1)) !== -1 && hits.length < 6) hits.push(i);
  if (hits.length) console.log(`${String(hits.length).padStart(3)}x ${JSON.stringify(n).padEnd(28)} @ ${hits.join(",")}`);
}
