// find-expected-hash.mjs — 在 claude.exe 等文件里找原 header 哈希（raw 字节或 hex 字符串）
import fs from "node:fs";

const needleHex = "4127757b0565b6f89786f8742299384d5e94ff2de4b6563b1fc76df62c3cc635";
const needleRaw = Buffer.from(needleHex, "hex");
const needleStr = Buffer.from(needleHex, "ascii");

const files = process.argv.slice(2);
for (const f of files) {
  let buf;
  try { buf = fs.readFileSync(f); } catch (e) { console.log(`SKIP ${f}: ${e.message}`); continue; }
  const hits = [];
  let i = -1;
  while ((i = buf.indexOf(needleRaw, i + 1)) !== -1) hits.push(["raw", i]);
  i = -1;
  while ((i = buf.indexOf(needleStr, i + 1)) !== -1) hits.push(["hexstr", i]);
  console.log(`${f}  size=${buf.length}  hits=${hits.length}` + (hits.length ? "  " + JSON.stringify(hits.slice(0, 5)) : ""));
}
