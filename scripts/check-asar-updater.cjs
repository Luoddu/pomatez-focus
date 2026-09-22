// 检查指定打包目录 asar 里的 updater.js 是否为 esbuild 打包产物
// （防 regression：preview.45 首发曾把 tsc 未打包输出装进安装包导致启动崩溃）
const asar = require("@electron/asar");
const path = require("path");

const dir = process.argv[2] || "dist-preview45b";
const asarPath = path.join(
  "app/electron",
  dir,
  "win-unpacked/resources/app.asar"
);
const src = asar.extractFile(asarPath, "build\\focus\\updater.js").toString();
const bare = (s) => (s.match(/require\("electron-updater"\)/g) || []).length;
console.log(dir, ":", src.length, "bytes, bare require:", bare(src));
if (bare(src) > 0 || src.length < 100000) {
  console.error("BAD: updater.js is NOT the esbuild bundle");
  process.exit(1);
}
console.log("OK: updater.js is the bundled updater");
