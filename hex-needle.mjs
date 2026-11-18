// hex-needle.mjs — 精确 hex 指定区域，确认真实字节
import fs from "node:fs";

const f = process.argv[2];
const off = Number(process.argv[3]);
const len = Number(process.argv[4] || 200);
const buf = fs.readFileSync(f);
const seg = buf.subarray(off, off + len);
console.log("utf8:", JSON.stringify(seg.toString("utf8")));
console.log("hex :");
for (let i = 0; i < seg.length; i += 16) {
  const row = seg.subarray(i, i + 16);
  console.log("  +" + String(i).padStart(3) + " " + row.toString("hex").replace(/(..)/g, "$1 "));
}
