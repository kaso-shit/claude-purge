#!/usr/bin/env node
// claude-purge v2 CLI — --scan / --status / --apply / --revert
import { patchStatus, applyPatches, revertPatches, scanReport, installRoot, unpackedRoot } from "../lib/core.js";

const mode = process.argv[2] || "--status";

function show(rows) {
  const tally = { applied: 0, pending: 0, partial: 0, no_match: 0, no_target: 0, other: 0 };
  for (const r of rows) {
    const mark = r.status === "applied" ? "✓" : r.status === "pending" ? "✗" : r.status === "partial" ? "◐" : r.status === "no_target" ? "∅" : "·";
    tally[r.status] = (tally[r.status] || 0) + (Object.prototype.hasOwnProperty.call(tally, r.status) ? 1 : 0);
    if (!Object.prototype.hasOwnProperty.call(tally, r.status)) tally.other += 1;
    const n = r.detail ? (r.detail.length > 1 ? ` [${r.detail.length} files: ${r.detail.map((d) => d.state).join(",")}]` : "") : "";
    console.log(`  ${mark} [#${String(r.id).padStart(2)}] ${String(r.name).padEnd(30)} ${r.layer} — ${r.status}${n}`);
  }
  console.log(`\n  tally: ${tally.applied} applied, ${tally.partial} partial, ${tally.pending} pending, ${tally.no_match} no_match, ${tally.no_target} no_target`);
}

console.log("claude-purge v2 / 版本自适应");
console.log("  install root  " + installRoot());
console.log("  unpacked root " + unpackedRoot());

if (mode === "--scan") {
  const rep = scanReport();
  console.log(`\n[scan] build 目录 ${rep.buildDir}`);
  console.log(`[scan] 扫描 ${rep.files} 个 .js，结果：`);
  show(rep.rows);
  console.log("\n[scan] 提示：这一版能发现旧版漏补的多处副本。pending/partial 的补丁可再 --apply 补齐。");
} else if (mode === "--status") {
  show(patchStatus());
} else if (mode === "--apply") {
  const report = applyPatches();
  for (const r of report) {
    const tag = r.status === "applied" ? "✓" : r.status === "partial" ? "◐" : "✗";
    console.log(`  ${tag} patch #${r.id} ${r.name} — ${r.status}` + (r.touched && r.touched.length ? ` (${r.touched.length} file(s): ${r.touched.join(",")})` : ""));
  }
  console.log("");
  show(patchStatus());
  const bad = report.filter((r) => r.status === "pending" || r.status === "partial");
  if (bad.length) { console.log("\n[WARN] 未完全应用: " + bad.map((b) => `#${b.id} ${b.name}`).join(", ")); process.exitCode = 2; }
} else if (mode === "--revert") {
  const r = revertPatches();
  console.log(`  reverted ${r.reverted.length} file(s): ${r.reverted.join(",")}`);
  for (const e of r.errors) console.log("  ERROR " + e[0] + " :: " + e[1]);
  show(patchStatus());
} else {
  console.log("用法: claude-purge --scan | --status | --apply | --revert");
}
