// fix-exe-hash2.mjs — 按固定位置(248718407)把 exe 里烘焙的原 asar hash 替换为新 asar 的 header hash
import fs from "node:fs";
import crypto from "node:crypto";
const [, , exe, newAsar] = process.argv;
if (!exe || !newAsar) { console.log("用法: node fix-exe-hash2.mjs <exe> <new.asar>"); process.exit(2); }
const POS = 248718407;
const eb = fs.readFileSync(exe);
const nb = fs.readFileSync(newAsar);
const oldHex = eb.subarray(POS, POS + 64).toString("ascii");
console.log("pos 处旧值 = " + oldHex);
console.log("是64位hex = " + /^[0-9a-f]{64}$/.test(oldHex) + "  以2541f12d开头 = " + oldHex.startsWith("2541f12d"));
if (!/^[0-9a-f]{64}$/.test(oldHex) || !oldHex.startsWith("2541f12d")) { console.log("!! offset 处不像预期原 hash，为避免改错，退出不动"); process.exit(1); }
const s4 = nb.readUInt32LE(12);
const newHash = crypto.createHash("sha256").update(nb.subarray(16, 16 + s4)).digest("hex");
console.log("新 asar json header hash = " + newHash);
const buf = Buffer.from(eb);
const oldBuf = Buffer.from(oldHex, "ascii"), newBuf = Buffer.from(newHash, "ascii");
let i = -1, c = 0;
while ((i = buf.indexOf(oldBuf, i + 1)) !== -1) { newBuf.copy(buf, i); c++; }
fs.writeFileSync(exe, buf);
console.log("替换 " + c + " 处; claude.exe 新 sha256=" + crypto.createHash("sha256").update(fs.readFileSync(exe)).digest("hex").slice(0, 16) + "…");
const pw = exe + ".payload";
if (fs.existsSync(pw)) { let p = fs.readFileSync(pw, "utf8"); const b = p; p = p.split(oldHex).join(newHash); if (p !== b) { fs.writeFileSync(pw, p); console.log("payload 已同步"); } }
console.log("DONE");
