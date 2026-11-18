// probe-context.mjs — 精确定位各补丁锚点上下文，用于设计跨版本自适应正则
import fs from "node:fs";
import path from "node:path";
const ROOT = process.env.CLAUDE_PURGE_UNPACKED || "C:\\Users\\18926\\Desktop\\新建文件夹 (2)\\claude_purge\\app_unpacked";
const BUILD = path.join(ROOT, ".vite", "build");
const files = fs.readdirSync(BUILD).filter(n => n.endsWith(".js")).map(n => path.join(BUILD, n));
const ctx = (t,i,len)=>t.slice(Math.max(0,i-70), Math.min(t.length,i+len+70)).replace(/\n/g,"\\n");
const RX = {
  defaultEnum: /var\s+[\w$]+\s*=\s*[\w$]+\.\w+\.Default\s*;/g,
  taskDefault: /permissionMode\s*:\s*"default"\s*,\s*tools\s*:\s*\[/g,
  chromeAsk:   /permissionMode\s*:\s*"ask"\s*,\s*sessionScope/g,
  dispatchCfg: /dispatchCodeTasksPermissionMode\s*:\s*"acceptEdits"/g,
  dispatchGate2: /===\s*"bypassPermissions"\s*&&\s*!?\w+\.\w+\(\)\s*\?\s*"acceptEdits"\s*:\s*\w+/g,
};
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const base = path.basename(f);
  for (const [name, re] of Object.entries(RX)) {
    re.lastIndex = 0; let m, n = 0;
    while ((m = re.exec(t)) !== null) {
      n++;
      if (n <= 3) console.log(`${base} [${name}] @${m.index} :: ${ctx(t,m.index,m[0].length).slice(0,240)}`);
      if (m[0].length === 0) re.lastIndex++;
    }
    if (n > 3) console.log(`${base} [${name}] … total ${n}`);
  }
}
// 提示词段重复情况：refusal 段在 BDio8wo1 / C7Cdmtz0 的形态
console.log("\n---- refusal 段副本对比 ----");
for (const name of ["index.chunk-BDio8wo1.js","index.chunk-C7Cdmtz0.js"]) {
  const p = path.join(BUILD, name);
  if (!fs.existsSync(p)) { console.log(name + " 不存在"); continue; }
  const t = fs.readFileSync(p, "utf8");
  const i = t.indexOf("<refusal_handling>");
  console.log(name + " :: 含direct-frame=" + t.includes("direct-completion frame") + " :: " + (i>=0?ctx(t,i,220).slice(0,320):"(无<refusal_handling>)"));
}
// 已 apply 的目标文件形态
console.log("\n---- 已 apply 目标文件形态 ----");
for (const name of ["index.chunk-BDt4sceH.js","index.chunk-BMD3yR2V.js","index.chunk-GzJE-29i.js","index.chunk-t59Rl3lf.js"]) {
  const p = path.join(BUILD, name);
  if (!fs.existsSync(p)) { console.log(name + " 不存在"); continue; }
  const t = fs.readFileSync(p, "utf8");
  const mk = (t.match(/\[claude-purge\][^*/"]{0,40}/g)||[]).slice(0,4);
  console.log(`${name} size=${t.length} markers=${JSON.stringify(mk)}`);
}
