// extract-base-prompt.mjs — 从 chunk 里抠出 DESKTOP_3P_BASE_PROMPT 模板串
import fs from "node:fs";

const f = "C:/Users/18926/Desktop/新建文件夹 (2)/claude_purge/app_unpacked/.vite/build/index.chunk-BDio8wo1.js";
const t = fs.readFileSync(f, "utf8");
const BT = String.fromCharCode(96); // `
const BS = String.fromCharCode(92); // \

const i = t.indexOf("DESKTOP_3P_BASE_PROMPT");
if (i < 0) throw new Error("marker not found");
const start = t.indexOf(BT, i);
if (start < 0) throw new Error("template start not found");
let j = start + 1;
while (j < t.length) {
  if (t[j] === BS) { j += 2; continue; }
  if (t[j] === BT) break;
  j++;
}
const s = t.slice(start + 1, j);
const out = "C:/Users/18926/Desktop/新建文件夹 (2)/claude_purge/desktop_3p_base_prompt.txt";
fs.writeFileSync(out, s);
console.log("length =", s.length);
console.log("---- first 4000 ----");
console.log(s.slice(0, 4000));
