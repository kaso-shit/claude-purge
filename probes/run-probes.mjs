// run-probes.mjs — 探针跑器：对任意 OpenAI/Anthropic 兼容端点逐模型跑 manifest 探针，判定通过/拒绝。
// 用法:
//   node run-probes.mjs --dry
//   node run-probes.mjs --provider openai --endpoint https://api.x.com --key KEY --model MODEL
//   node run-probes.mjs --provider anthropic --endpoint https://api.anthropic.com --key KEY --models "m1,m2"
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dir, "manifest.json"), "utf8"));

function arg(name, def) { const i = process.argv.indexOf("--" + name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }
const has = (n) => process.argv.includes("--" + n);

const identity = manifest.identity;
const cap = manifest.capability;
const execs = manifest.exec;
const total = identity.length + 1 + execs.length;

if (has("dry")) {
  console.log("探针总数:", total, "(identity", identity.length, "+ capability 1 + exec", execs.length, ")");
  identity.forEach((p) => console.log("  [id]", p.id, "-", p.prompt));
  console.log("  [cap]", cap.id, "-", cap.prompt, "(覆盖", cap.expect_groups.length, "组, min", cap.min_groups, ")");
  execs.forEach((p) => console.log("  [exec]", p.id, "[" + p.cat + "]", p.prompt));
  process.exit(0);
}

const provider = arg("provider", "openai");
const endpoint = arg("endpoint", "");
const key = arg("key", process.env.PROBE_KEY || "");
const models = (arg("models", arg("model", "")) || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!endpoint || !models.length) { console.error("需要 --endpoint 和 --model/--models"); process.exit(2); }

async function invoke(model, prompt) {
  if (provider === "anthropic") {
    const r = await fetch(endpoint.replace(/\/$/, "") + "/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    const j = await r.json();
    if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 200));
    return (j.content || []).map((b) => b.text || "").join("");
  }
  const r = await fetch(endpoint.replace(/\/$/, "") + "/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false }),
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 200));
  return j.choices?.[0]?.message?.content || "";
}

const refused = (txt, forbid) => forbid.some((w) => txt.toLowerCase().includes(w.toLowerCase()));

async function judge(model, p, kind) {
  let txt;
  try { txt = await invoke(model, p.prompt); }
  catch (e) { return { id: p.id, status: "ERROR", note: String(e.message).slice(0, 80) }; }
  if (!txt) return { id: p.id, status: "EMPTY" };
  if (refused(txt, p.forbid || [])) return { id: p.id, status: "FAIL(refusal)", note: txt.slice(0, 60) };
  if (kind === "identity") {
    return { id: p.id, status: p.expect_any.some((w) => txt.includes(w)) ? "PASS" : "FAIL(identity)", note: txt.slice(0, 60) };
  }
  if (kind === "capability") {
    let hit = 0;
    for (const g of p.expect_groups) if (g.some((w) => txt.toLowerCase().includes(w.toLowerCase()))) hit++;
    return { id: p.id, status: hit >= p.min_groups ? "PASS" : "FAIL(coverage)", note: `覆盖 ${hit}/${p.expect_groups.length} 组 (min ${p.min_groups})` };
  }
  return { id: p.id, status: p.expect_any.some((w) => txt.toLowerCase().includes(w.toLowerCase())) ? "PASS" : "FAIL(keyword)", note: "" };
}

function pad(s, n) { s = String(s); return s + " ".repeat(Math.max(0, n - s.length)); }

const report = { ts: new Date().toISOString(), provider, models: {}, summary: {} };
for (const model of models) {
  console.log(`\n===== 模型: ${model} =====`);
  const rows = [];
  for (const p of identity) rows.push(await judge(model, p, "identity"));
  rows.push(await judge(model, cap, "capability"));
  for (const p of execs) rows.push(await judge(model, p, "exec"));
  let pass = 0;
  for (const r of rows) { if (r.status.startsWith("PASS")) pass++; console.log(`  ${pad(r.status, 16)} ${pad(r.id, 8)} ${r.note || ""}`); }
  const summary = { pass, total: rows.length, rate: (pass / rows.length * 100).toFixed(1) + "%" };
  console.log(`  --> ${pass}/${rows.length} (${summary.rate})`);
  report.models[model] = { rows, summary };
  report.summary[model] = summary;
}

const out = path.join(__dir, "report-" + Date.now() + ".json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log("\n报告已写: " + out);
