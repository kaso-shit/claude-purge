// scan-version.mjs — 版本自适应探测器原型
// 目的：不依赖固定 chunk 文件名，改用内容特征定位所有补丁目标。
// 输出：每个 .vite/build 文件命中了哪些特征签名 + 关键锚点上下文片段。
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.CLAUDE_PURGE_UNPACKED
  || "C:\\Users\\18926\\Desktop\\新建文件夹 (2)\\claude_purge\\app_unpacked";
const BUILD = path.join(ROOT, ".vite", "build");

// 内容特征签名（跨版本：只看语义字符串/结构，不看文件名/哈希）
const PROBES = {
  "refusal_seg":          /<refusal_handling>/,
  "legal_seg":            /<legal_and_financial_advice>/,
  "wellbeing_seg":        /<user_wellbeing>/,
  "evenhanded_seg":       /<evenhandedness>/,
  "toolresult_seg":       /<tool_result_safety>/,
  "webcontent_seg":       /<web_content_restrictions>/,
  "bypassPerm":           /bypassPermissions/,
  "PermissionsDefault":   /\.Default\b/,
  "task_default":         /permissionMode\s*:\s*["']default["']/,
  "chrome_ask":           /permissionMode\s*:\s*["']ask["']\s*,\s*sessionScope/,
  "dispatch_key":         /dispatchCodeTasksPermissionMode/,
  "accept_edits":         /acceptEdits/,
  "askuser_friction":     /AskUserQuestion/,
  "todo_friction":        /TaskCreate/,
};

// 关键锚点：打印其周边片段，便于设计跨版本替换正则
const ANCHORS = [
  /var\s+[\w$]+\s*=\s*[\w$]+\.\w+\.Default\s*;/,
  /function\s+[\w$]+\s*\(\s*[\w$]+\s*\)\s*\{\s*return\s+[\w$]+\s*===\s*["']bypassPermissions["']/,
  /permissionMode\s*:\s*["']default["']\s*,\s*tools\s*:\s*\[/,
  /permissionMode\s*:\s*["']ask["']\s*,\s*sessionScope/,
  /dispatchCodeTasksPermissionMode/,
];

function ctx(text, idx, len) {
  const a = Math.max(0, idx - 40), b = Math.min(text.length, idx + len + 40);
  return text.slice(a, b).replace(/\n/g, "\\n");
}

const files = fs.readdirSync(BUILD, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith(".js"))
  .map((e) => path.join(BUILD, e.name));

console.log("SCAN_ROOT " + BUILD);
console.log("JS files: " + files.length + "\n");

let hitsByProbe = {};
for (const [name] of Object.entries(PROBES)) hitsByProbe[name] = [];

for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  const hits = [];
  for (const [name, re] of Object.entries(PROBES)) {
    if (re.test(text)) { hits.push(name); hitsByProbe[name].push(path.basename(f) + `(${text.length})`); }
  }
  if (hits.length < 2) continue; // 只报多特征命中的候选文件，降噪
  console.log("=== " + path.basename(f) + "  size=" + text.length + "  hits=" + hits.join(","));
  for (const re of ANCHORS) {
    const m = re.exec(text);
    if (m) console.log("    anchor " + re.source.slice(0, 30) + "… @ " + m.index + " :: " + ctx(text, m.index, m[0].length).slice(0, 200));
  }
  console.log("");
}

console.log("---- 特征 -> 命中文件数 ----");
for (const [name, arr] of Object.entries(hitsByProbe)) {
  console.log("  " + name.padEnd(22) + " " + arr.length + (arr.length <= 6 ? "  " + arr.join(" ") : ""));
}
