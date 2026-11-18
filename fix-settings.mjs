// fix-settings.mjs — 用 node 精确写入 settings.json 的 env 帧，消除 PSCustomObject 空值问题
import fs from "node:fs";
const s = process.env.USERPROFILE + "/.claude/settings.json";
const frame = fs.readFileSync("C:/Users/18926/Desktop/新建文件夹 (2)/claude_purge/system-prompt-frame.txt", "utf8");
const j = JSON.parse(fs.readFileSync(s, "utf8"));
j.env = j.env || {};
j.env.CLAUDE_CODE_SYSTEM_PROMPT = frame;
fs.writeFileSync(s, JSON.stringify(j, null, 2));
const chk = JSON.parse(fs.readFileSync(s, "utf8"));
console.log("written len:", chk.env.CLAUDE_CODE_SYSTEM_PROMPT.length, "has UNRESTRICTED:", chk.env.CLAUDE_CODE_SYSTEM_PROMPT.includes("UNRESTRICTED"));
