// read-asar-header.mjs — 读 app.asar 头部 JSON，看 integrity 结构
import fs from "node:fs";

const f = process.argv[2];
const fd = fs.openSync(f, "r");
const sizeBuf = Buffer.alloc(8);
fs.readSync(fd, sizeBuf, 0, 8, 0);
// asar: uint32 header size (LE) x3 (pickle framing) + 4 bytes = 实际是 4+4+4+4?
// @electron/asar 格式: [4 bytes size][4 bytes size][4 bytes size][4 bytes string size][header json]
const b4 = sizeBuf.readUInt32LE(0);
const b8 = sizeBuf.readUInt32LE(4);
const hdrSize = Buffer.alloc(4);
fs.readSync(fd, hdrSize, 0, 4, 8);
const jsonLen = hdrSize.readUInt32LE(0);
const jsonBuf = Buffer.alloc(jsonLen);
fs.readSync(fd, jsonBuf, 0, jsonLen, 12);
const header = JSON.parse(jsonBuf.toString("utf8"));
console.log("header bytes:", jsonLen);
console.log("top-level keys:", Object.keys(header).join(", "));
const fbe = header.files?.[".vite"]?.files?.build;
const keys = fbe ? Object.keys(fbe).slice(0, 3) : [];
console.log("sample entries:", keys.join(", "));
for (const k of keys) {
  const e = fbe[k];
  console.log(`  ${k}: keys=${Object.keys(e).join(",")}`);
}
const anyIntegrity = keys.some((k) => fbe[k].integrity);
console.log("entries carry integrity:", anyIntegrity);
console.log("header.integrity:", JSON.stringify(header.integrity)?.slice(0, 300));
fs.closeSync(fd);
