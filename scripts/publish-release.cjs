// 创建 preview.42 的 GitHub Release（prerelease）并上传安装包与 preview.yml。
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "app", "electron", "dist");
const TAG = "v0.1.0-preview.42";
const PROXY = "http://127.0.0.1:7890";

const token = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
})
  .split("\n")
  .find((l) => l.startsWith("password="))
  .slice("password=".length);
if (!token) throw new Error("no github token from credential helper");

const api = (args, body) => {
  const r = execFileSync(
    "curl",
    [
      "-sS", "-x", PROXY,
      "-H", "Authorization: Bearer " + token,
      "-H", "Accept: application/vnd.github+json",
      "-H", "X-GitHub-Api-Version: 2022-11-28",
      ...args,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return JSON.parse(r);
};

const payloadPath = path.join(require("node:os").tmpdir(), "release-payload.json");
fs.writeFileSync(payloadPath, JSON.stringify({
  tag_name: TAG,
  target_commitish: "549ccd2f03aa4eb02e5470cb99687beaaa1ec73a",
  name: "Pomatez Focus 0.1.0-preview.42 · 农场体验增强",
  body: [
    "## 0.1.0-preview.42 农场体验增强",
    "",
    "- 丰收筐重做：果堆随累计收获逐层长高，新番茄弹跳入筐；30/100 颗加侧筐，超量金色 +N 徽标；50/100/200/300/500/1000 颗金星级程碑旗。",
    "- 季节时令：按北京时间月份换景——春飘花瓣、夏来蜻蜓、秋落红叶、冬落雪覆土、稻草人戴红围巾。",
    "- 专注记录：同步状态圆点徽标（绿=已共享、橙=待同步、灰=本地）；「修改」改铅笔图标，悬浮行滑出。",
    "- 概览：今日番茄成就分级变色；总番茄里程碑进度条（10→1000 档，满档「🏆 丰收传奇」）。",
    "- 新增 seasonOfMonth/beijingMonth/totalMilestone 纯函数与 11 项单测；156 项测试与 98 项界面检查全部通过。",
    "",
    "源码：549ccd2（codex/feishu-focus）。校验文件见 preview.yml（SHA-512）。",
  ].join("\n"),
  draft: false,
  prerelease: true,
  generate_release_notes: false,
}));
const release = api(["-X", "POST", "-H", "Content-Type: application/json; charset=utf-8", "https://api.github.com/repos/Luoddu/pomatez-focus/releases", "--data-binary", "@" + payloadPath]);
if (!release.upload_url) throw new Error("release create failed: " + JSON.stringify(release).slice(0, 400));
console.log("release created:", release.html_url);

const uploadBase = release.upload_url.replace("{?name,label}", "");
for (const file of [
  "Pomatez-Focus-v0.1.0-preview.42-win-x64-setup.exe",
  "Pomatez-Focus-v0.1.0-preview.42-win-x64-portable.exe",
  "preview.yml",
]) {
  const out = execFileSync("curl", [
    "-sS", "-x", PROXY,
    "-H", "Authorization: Bearer " + token,
    "-H", "Accept: application/vnd.github+json",
    "-H", "Content-Type: application/octet-stream",
    "-X", "POST",
    "--data-binary", "@" + path.join(dist, file),
    uploadBase + "?name=" + encodeURIComponent(file),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const j = JSON.parse(out);
  if (!j.browser_download_url) throw new Error("upload failed for " + file + ": " + out.slice(0, 300));
  console.log("uploaded:", file, j.size, "bytes");
}
console.log("DONE");
