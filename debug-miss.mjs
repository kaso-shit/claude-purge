// debug-miss.mjs — 逐个 pattern 对文件做 includes 检查，打印差异
import fs from "node:fs";

const BASE = "C:/Users/18926/Desktop/新建文件夹 (2)/claude_purge/app_unpacked/.vite/build/";
const checks = [
  ["#7a", "index.chunk-BDio8wo1.js", "Claude is implemented on top of Claude Code and the Claude Agent SDK, but Claude is NOT Claude Code and should not refer to itself as such."],
  ["#7b", "index.chunk-BDio8wo1.js", "Claude should not mention implementation details like this, or Claude Code or the Claude Agent SDK, unless it is relevant to the user's request."],
  ["#8",  "index.chunk-BDio8wo1.js", "Claude should always use this tool before starting any real work\u2014research, multi-step tasks, file creation, or any workflow involving multiple steps or tool calls. The only exception is simple back-and-forth conversation or quick factual questions."],
  ["#12", "index.chunk-GzJE-29i.js", '{permissionMode:"ask",sessionScope:'],
  ["#13a","index.chunk-t59Rl3lf.js", 't.eft("dispatchCodeTasksPermissionMode")??"acceptEdits"'],
  ["#13b","index.chunk-t59Rl3lf.js", 'let e=t.ydt("1434290056")?t.eft("dispatchCodeTasksPermissionMode")??"acceptEdits":"acceptEdits";'],
  ["#13c","index.chunk-t59Rl3lf.js", 'return e==="bypassPermissions"&&!t.Sc()?"acceptEdits":e'],
];

for (const [id, f, needle] of checks) {
  const t = fs.readFileSync(BASE + f, "utf8");
  const hit = t.includes(needle);
  console.log(`${id} ${hit ? "HIT " : "MISS"} ${f}`);
  if (!hit) {
    // 找一个近似锚点打印周边
    const probe = needle.slice(0, 24);
    const i = t.indexOf(probe);
    if (i >= 0) {
      console.log("  周边: " + JSON.stringify(t.slice(i, i + needle.length + 30)));
    } else {
      console.log("  连探针都没找到: " + JSON.stringify(probe));
    }
  }
}
