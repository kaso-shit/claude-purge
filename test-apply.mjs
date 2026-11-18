// test-apply.mjs — 零风险验证：对待补文本做 parse 对比，确保 --apply 不会引入语法错误。
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { PATCHES, unpackedRoot } from "./lib/core.js";

const BUILD = path.join(unpackedRoot(), ".vite", "build");
const files = fs.readdirSync(BUILD).filter((n) => n.endsWith(".js"));
function parseOK(code) { try { new vm.Script(code); return { ok: true }; } catch (e) { return { ok: false, msg: String(e.message || e) }; } }

let changedCount = 0, badCount = 0, skipApplied = 0;
for (const p of PATCHES) {
  for (const n of files) {
    const t = fs.readFileSync(path.join(BUILD, n), "utf8");
    const isCand = (typeof p.probe === "function" ? p.probe(t) : (p.probe instanceof RegExp ? p.probe.test(t) : false)) || (p.marker && t.includes(p.marker));
    if (!isCand) continue;
    if (t.includes(p.marker)) { skipApplied++; continue; }
    const r = p.applyText(t);
    if (!r.changed) continue;
    if (typeof r.text !== "string") { console.log(`#${p.id} ${n} BUG: changed 但 text 非字符串`); badCount++; continue; }
    const before = parseOK(t), after = parseOK(r.text);
    changedCount++;
    const introducedError = before.ok && !after.ok;
    if (introducedError) badCount++;
    console.log(`#${String(p.id).padStart(2)} ${n.padEnd(28)} via=${String(r.via).padEnd(18)} beforeOK=${before.ok} afterOK=${after.ok}${introducedError ? "  <<< INTRODUCED ERROR: " + after.msg.slice(0, 90) : ""}`);
  }
}
console.log(`\n待补文件 ${changedCount} 个；已 applied 跳过 ${skipApplied} 处；引入语法错误 ${badCount} 个`);
console.log(badCount === 0 ? "RESULT: PASS（所有替换保持可解析，apply 安全）" : "RESULT: FAIL（存在破坏语法的替换，请检查）");
