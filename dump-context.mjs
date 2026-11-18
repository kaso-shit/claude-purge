// dump-context.mjs — 打印指定偏移周围的原文
import fs from "node:fs";

const f = process.argv[2];
const offs = process.argv.slice(3).map(Number);
const buf = fs.readFileSync(f);
for (const off of offs) {
  const start = Math.max(0, off - 200);
  const end = Math.min(buf.length, off + 700);
  console.log(`===== @${off} =====`);
  console.log(JSON.stringify(buf.subarray(start, end).toString("utf8")));
}
