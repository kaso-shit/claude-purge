// fill-exe-hash.mjs — 把新 asar 的 header 哈希回填进 claude.exe（按值定位原哈希并等长替换）+ 同步 payload
import fs from "node:fs";
import crypto from "node:crypto";
const [, , exe, origAsar, newAsar] = process.argv;
if (!exe || !origAsar || !newAsar) { console.log("用法: node fill-exe-hash.mjs <exe> <orig.asar.bak> <new.asar>"); process.exit(2); }
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const cands = (buf) => { const s4 = buf.readUInt32LE(12); return { json: buf.subarray(16, 16 + s4), "framing+json": buf.subarray(0, 16 + s4), "json+1": buf.subarray(16, 16 + s4 + 1) }; };
const ob = fs.readFileSync(origAsar), nb = fs.readFileSync(newAsar);
const eb = fs.readFileSync(exe);
let alg = null, oldHash = null, hits = [];
for (const [name, slice] of Object.entries(cands(ob))) {
  const h = sha(slice), raw = Buffer.from(h, "hex"), hex = Buffer.from(h, "ascii");
  let hs = [], i = -1; while ((i = eb.indexOf(raw, i + 1)) !== -1) hs.push(["raw", i]);
  i = -1; while ((i = eb.indexOf(hex, i + 1)) !== -1) hs.push(["hexstr", i]);
  console.log(name + " -> " + h.slice(0, 16) + "… exe命中=" + hs.length);
  if (!alg && hs.length) { alg = name; oldHash = h; hits = hs; }
}
if (!alg) { console.log("NO_MATCH_IN_EXE（该版本可能无 asar 完整性校验，可直接替换 app.asar）"); process.exit(0); }
const newHash = sha(cands(nb)[alg]);
console.log("算法=" + alg + "  oldHash=" + oldHash.slice(0, 16) + "…  newHash=" + newHash.slice(0, 16) + "…");
let n = 0;
for (const [kind, pos] of hits) { if (kind === "raw") Buffer.from(newHash, "hex").copy(eb, pos); else Buffer.from(newHash, "ascii").copy(eb, pos); n++; }
fs.writeFileSync(exe, eb);
console.log("回填 " + n + " 处; claude.exe 新 sha256=" + sha(fs.readFileSync(exe)).slice(0, 16) + "…");
const pw = exe + ".payload";
if (fs.existsSync(pw)) { let p = fs.readFileSync(pw, "utf8"); const b = p; p = p.split(oldHash).join(newHash); if (p !== b) { fs.writeFileSync(pw, p); console.log("payload 已同步"); } else console.log("payload 未含 oldHash（跳过）"); }
console.log("DONE");
