// verify-asar-hash.mjs — 只读验证：claude.exe 里是否烘焙了 resources/app.asar 的 header 哈希，
// 以及用哪种候选算法能命中（证明 asar-repack 的「按值定位回填」逻辑成立）。全程不修改文件。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const root = process.env.CLAUDE_PURGE_ROOT || "D:\\WindowsApps\\Claude_5.11492.2.0_x64__pzs8sxrjxfjjc\\app";
const asar = path.join(root, "resources", "app.asar");
const exe = path.join(root, "claude.exe");
console.log("root:", root);
for (const p of [asar, exe]) console.log("  exists", fs.existsSync(p), p);
if (!fs.existsSync(asar) || !fs.existsSync(exe)) { console.log("缺文件，跳过"); process.exit(0); }
const ab = fs.readFileSync(asar);
const eb = fs.readFileSync(exe);
console.log("app.asar size=", ab.length, " claude.exe size=", eb.length);
const s4 = ab.readUInt32LE(12);
const cands = {
  "json[16..16+jsonLen]": ab.subarray(16, 16 + s4),
  "framing+json[0..16+jsonLen]": ab.subarray(0, 16 + s4),
  "json[16..16+jsonLen+1]": ab.subarray(16, 16 + s4 + 1),
};
for (const [name, slice] of Object.entries(cands)) {
  const h = sha(slice);
  const raw = Buffer.from(h, "hex"), hex = Buffer.from(h, "ascii");
  const hits = [];
  let i = -1; while ((i = eb.indexOf(raw, i + 1)) !== -1) hits.push(["raw", i]);
  i = -1; while ((i = eb.indexOf(hex, i + 1)) !== -1) hits.push(["hexstr", i]);
  console.log(`${hits.length ? "MATCH" : "     "} ${name} -> ${h.slice(0,16)}…  exe命中=${hits.length}` + (hits.length?" "+JSON.stringify(hits.slice(0,3)):""));
}
