// repro-header-hash.mjs — 复现 Electron 的 header 哈希算法
// 目标：让某种哈希方式 == 4127757b0565b6f89786f8742299384d5e94ff2de4b6563b1fc76df62c3cc635（我重打包后的 actual 值）
import fs from "node:fs";
import crypto from "node:crypto";

const f = process.argv[2];
const buf = fs.readFileSync(f);
const s1 = buf.readUInt32LE(0);
const s2 = buf.readUInt32LE(4);
const s3 = buf.readUInt32LE(8);
const s4 = buf.readUInt32LE(12);
console.log("size fields:", s1, s2, s3, s4, " jsonLen(s4)=", s4);

const target = "4127757b0565b6f89786f8742299384d5e94ff2de4b6563b1fc76df62c3cc635";
const candidates = {
  "json[16..16+s4]": buf.subarray(16, 16 + s4),
  "json[16..16+s3]": buf.subarray(16, 16 + s3),
  "json[16..16+s2]": buf.subarray(16, 16 + s2),
  "framing+json[0..16+s4]": buf.subarray(0, 16 + s4),
  "json+pad[16..16+s4+1]": buf.subarray(16, 16 + s4 + 1),
};
for (const [name, b] of Object.entries(candidates)) {
  const h = crypto.createHash("sha256").update(b).digest("hex");
  console.log(`${h === target ? "MATCH " : "      "} ${name} -> ${h.slice(0, 24)}...`);
}
// 也试试原包的 expected
const orig = fs.readFileSync(f + ".claude-purge.bak");
const o4 = orig.readUInt32LE(12);
console.log("orig jsonLen:", o4, " orig json sha256:", crypto.createHash("sha256").update(orig.subarray(16, 16 + o4)).digest("hex").slice(0, 24) + "... (expected 2541f12d...)");
