// split-prompt.mjs — 把 \n 还原成真换行，按 XML 段落拆号
import fs from "node:fs";
const f = "C:/Users/18926/Desktop/新建文件夹 (2)/claude_purge/desktop_3p_base_prompt.txt";
const raw = fs.readFileSync(f, "utf8");
const text = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
const out = "C:/Users/18926/Desktop/新建文件夹 (2)/claude_purge/desktop_3p_base_prompt.pretty.txt";
fs.writeFileSync(out, text);
const tags = [...text.matchAll(/<([a-z_0-9]+)>/g)].map((m) => m[1]);
const uniq = [...new Set(tags)];
console.log("total chars:", text.length);
console.log("sections:", uniq.join(", "));
