// asar-repack.mjs — 一键：重打包 app.asar + 回填 claude.exe 里的 header 完整性哈希 + 同步 .payload
//
// 回填策略（自适应）：
//  1) 优先「按值」：对原版 app.asar(orig) 算多种候选哈希，在 claude.exe 里搜到哪个就用哪个算法，
//     再用同算法算新 asar 的哈希，原位等长替换。
//  2) 兜底「按固定位置」：若 orig 是旧版本(哈希与 exe 现存的不一致→搜不到)，则读 exe 已知偏移
//     248,718,407 处烘焙的旧 hash，换成新 asar 的 header hash（针对 Claude 5.11492.2.0）。
//
// 用法：
//   node asar-repack.mjs --unpacked <app_unpacked> --exe <claude.exe> --orig <app.asar.claude-purge.bak> [--out <newApp.asar>]
//   建议把项目放在【纯英文路径】下运行（如 C:\claude_purge），避免中文/空格路径导致 npx 打包异常。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const unpacked = arg("unpacked", process.env.CLAUDE_PURGE_UNPACKED || "");
const root = arg("root", process.env.CLAUDE_PURGE_ROOT || "");
const exe = arg("exe", root ? path.join(root, "claude.exe") : "");
const orig = arg("orig", root ? path.join(root, "resources", "app.asar.claude-purge.bak") : "");
const payload = arg("payload", exe ? exe + ".payload" : "");
const out = arg("out", unpacked ? path.join(path.dirname(unpacked), "app.patched.asar") : "app.patched.asar");

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const headerCandidates = (buf) => {
  const s4 = buf.readUInt32LE(12);
  return {
    "json[16..16+jsonLen]": buf.subarray(16, 16 + s4),
    "framing+json[0..16+jsonLen]": buf.subarray(0, 16 + s4),
    "json[16..16+jsonLen+1]": buf.subarray(16, 16 + s4 + 1),
  };
};

console.log("== asar-repack ==");
console.log("  unpacked:", unpacked);
console.log("  exe     :", exe);
console.log("  orig    :", orig);
console.log("  out     :", out);
if (!unpacked || !fs.existsSync(unpacked)) { console.error("[FAIL] --unpacked 不存在"); process.exit(1); }
if (!exe || !fs.existsSync(exe)) { console.error("[FAIL] --exe 不存在"); process.exit(1); }
if (!orig || !fs.existsSync(orig)) { console.error("[FAIL] --orig 不存在（先备份原包：Copy-Item app.asar app.asar.claude-purge.bak）"); process.exit(1); }

// 1) 重打包（用 execSync 走 shell，修复 Windows 下 execFileSync('npx.cmd') 的 EINVAL）
console.log("\n[1] 重打包 asar（npx @electron/asar，首次需联网）…");
try {
  execSync(`npx --yes @electron/asar pack "${unpacked}" "${out}"`, { stdio: "inherit" });
} catch (e) {
  console.error("[FAIL] asar 打包失败：" + e.message);
  console.error("  手动：npx @electron/asar pack \"" + unpacked + "\" \"" + out + "\"");
  process.exit(1);
}
const newBuf = fs.readFileSync(out);
const origBuf = fs.readFileSync(orig);

// 2) 按值定位
console.log("\n[2] 按值定位 exe 里烘焙的原 header 哈希…");
const exeBuf = fs.readFileSync(exe);
let matchedAlg = null, oldHash = null, hitPositions = [];
for (const [name, slice] of Object.entries(headerCandidates(origBuf))) {
  const h = sha(slice);
  const raw = Buffer.from(h, "hex"), hex = Buffer.from(h, "ascii");
  const hits = []; let i = -1;
  while ((i = exeBuf.indexOf(raw, i + 1)) !== -1) hits.push(["raw", i]);
  i = -1; while ((i = exeBuf.indexOf(hex, i + 1)) !== -1) hits.push(["hexstr", i]);
  console.log(`  ${name} -> ${h.slice(0, 16)}…  exe命中 ${hits.length}`);
  if (!matchedAlg && hits.length) { matchedAlg = name; oldHash = h; hitPositions = hits; }
}

let newHash = null, patched = 0;
if (matchedAlg) {
  newHash = sha(headerCandidates(newBuf)[matchedAlg]);
  console.log(`\n[3] 命中算法 ${matchedAlg}; old=${oldHash.slice(0,16)}… new=${newHash.slice(0,16)}…`);
  for (const [kind, pos] of hitPositions) {
    if (kind === "raw") Buffer.from(newHash, "hex").copy(exeBuf, pos); else Buffer.from(newHash, "ascii").copy(exeBuf, pos);
    patched++;
  }
} else {
  // 兜底：按固定位置（针对 Claude 5.11492.2.0）
  const POS = 248718407;
  const oldHex = exeBuf.subarray(POS, POS + 64).toString("ascii");
  console.log("\n[3] 按值没搜到（orig 可能是旧版本 asar）。尝试按固定位置 " + POS + " 回填…");
  console.log("    pos 处现值 = " + oldHex);
  if (/^[0-9a-f]{64}$/.test(oldHex)) {
    oldHash = oldHex;
    newHash = sha(headerCandidates(newBuf)["json[16..16+jsonLen]"]);
    Buffer.from(newHash, "ascii").copy(exeBuf, POS); patched = 1;
    console.log(`    按固定位置回填 1 处; new=${newHash.slice(0,16)}…`);
  } else {
    console.log("\n[WARN] 两种方式都没定位到原 hash。可能该版本无 asar 完整性校验（可直接替换 app.asar），");
    console.log("  或偏移不同——请用 verify-asar-hash.mjs 排查，或用 fill-exe-hash2.mjs 手动指定。");
    console.log("  已生成新 asar：" + out + "（可手动替换试启动）。");
    process.exit(0);
  }
}

fs.writeFileSync(exe, exeBuf);
console.log(`  已回填 ${patched} 处；claude.exe 新 sha256=${sha(fs.readFileSync(exe)).slice(0,16)}…`);

// 4) 同步 .payload
if (payload && fs.existsSync(payload)) {
  let p = fs.readFileSync(payload, "utf8"); const before = p;
  p = p.split(oldHash).join(newHash);
  if (p !== before) { fs.writeFileSync(payload, p); console.log("  payload 已同步"); }
} else console.log("  （无 .payload，跳过）");

console.log("\n[DONE] 新 asar 已生成并完成哈希回填。下一步：把 " + out + " 覆盖到 resources/app.asar，重启。");
