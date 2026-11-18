// probe-cli-armor.mjs — 在 claude.exe 里找装甲字符串（raw / utf8）
import fs from "node:fs";

const f = process.argv[2];
const buf = fs.readFileSync(f);
console.log("file:", f, "size:", buf.length);

const needles = [
  "You are Claude Code",
  "does not write or explain or work on malicious code",
  "malicious code, including malware",
  "Claude can discuss virtually any topic",
  "CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK",
  "bypassPermissions",
  "permission-mode",
  "refusal_handling",
];
for (const n of needles) {
  const b = Buffer.from(n, "utf8");
  const hits = [];
  let i = -1;
  while ((i = buf.indexOf(b, i + 1)) !== -1 && hits.length < 3) hits.push(i);
  console.log(`${hits.length ? "HIT " : "miss"} ${JSON.stringify(n).slice(0, 60)} ${hits.join(",")}`);
}
