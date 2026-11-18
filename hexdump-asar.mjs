// hexdump-asar.mjs — 看原 asar 头尾字节，定位 header 期望哈希
import fs from "node:fs";

const f = process.argv[2];
const fd = fs.openSync(f, "r");
const size = fs.fstatSync(fd).size;
const head = Buffer.alloc(64);
fs.readSync(fd, head, 0, 64, 0);
console.log("file size:", size);
console.log("head hex:");
for (let i = 0; i < 64; i += 16) {
  console.log("  " + head.subarray(i, i + 16).toString("hex").replace(/(..)/g, "$1 "));
}
const tail = Buffer.alloc(64);
fs.readSync(fd, tail, 0, 64, size - 64);
console.log("tail hex (last 64 bytes):");
for (let i = 0; i < 64; i += 16) {
  console.log("  " + tail.subarray(i, i + 16).toString("hex").replace(/(..)/g, "$1 "));
}
console.log("tail ascii:", JSON.stringify(tail.toString("latin1")));
fs.closeSync(fd);
