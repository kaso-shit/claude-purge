// probe-sysprompt-keys.mjs — 找系统提示相关的设置键/环境变量名
import fs from "node:fs";
const buf = fs.readFileSync(process.argv[2]);
const needles = [
  "CLAUDE_CODE_SYSTEM_PROMPT",
  "ANTHROPIC_SYSTEM_PROMPT",
  "systemPromptAppend",
  "appendSystemPrompt",
  "append_system_prompt",
  "custom_system_prompt",
  "systemPrompt",
  "SYSTEM_PROMPT",
  "BASH_DEFAULT_TIMEOUT_MS",
  "CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK",
];
for (const n of needles) {
  const b = Buffer.from(n, "utf8");
  const hits = [];
  let i = -1;
  while ((i = buf.indexOf(b, i + 1)) !== -1 && hits.length < 4) hits.push(i);
  console.log(`${hits.length ? "HIT " : "miss"} ${n} ${hits.join(",")}`);
}
