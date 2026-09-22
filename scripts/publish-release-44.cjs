// 创建 preview.44 的 GitHub Release（prerelease）并上传安装包与 preview.yml。
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
// 本轮 dist 被 Kimi 桌面进程持锁，打包输出在备用目录 dist-preview44
const dist = path.join(root, "app", "electron", "dist-preview44");
const TAG = "v0.1.0-preview.44";
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
  try {
    return JSON.parse(
      execFileSync(
        "curl",
        [
          "-sS", "-x", PROXY, "--max-time", "560",
          "-H", "Authorization: Bearer " + token,
          "-H", "Accept: application/vnd.github+json",
          "-H", "X-GitHub-Api-Version: 2022-11-28",
          ...args,
        ],
        { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
      )
    );
  } catch (e) {
    // 代理不可用时直连重试
    return JSON.parse(
      execFileSync(
        "curl",
        [
          "-sS", "--max-time", "560",
          "-H", "Authorization: Bearer " + token,
          "-H", "Accept: application/vnd.github+json",
          "-H", "X-GitHub-Api-Version: 2022-11-28",
          ...args,
        ],
        { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
      )
    );
  }
};

const payloadPath = path.join(require("node:os").tmpdir(), "release-payload-44.json");
fs.writeFileSync(payloadPath, JSON.stringify({
  tag_name: TAG,
  target_commitish: "51461998db26c2043f4c5321ecbf959448141f25",
  name: "Pomatez Focus 0.1.0-preview.44 · 统计翻页与节气动物",
  body: [
    "## 0.1.0-preview.44 统计翻页与节气动物",
    "",
    "- 专注统计自由翻页：周/月/季/年四个区间都支持 ‹ › 前后切换，离开本期时区间标签旁出现「回到本周/月/季/年」，点标签一键回到当前；「下一区间」在本期自动禁用。",
    "- 时段热力图转置为周历式竖排：列=周一~周日、行=0–24 点每半小时一格，时间自上而下流动，整点刻度每 2 小时标注；当前半小时格描边高亮。",
    "- 柱状图成就分级：不再是只有历史最佳才配金色——每天 5–9 个番茄为深红「小丰收」、≥10 个为金色「大丰收」，持久战每天都有奔头，附图例。",
    "- 农场节气动物：猫头鹰夜间（19:30–5:30）栖上栅栏守田、会眨眼；大雁秋季南飞、雨水起北归（人字雁阵横越天空，方向真实区分）；萤火虫只在夏夜出没，蝴蝶限春秋白天；全部适配系统「减少动态」。",
    "- 四象限任务行：「已收 x/y」进度格从右侧移到任务名下方、红色番茄筹码上方，先看到进度再点番茄。",
    "- 179 项单测、109 项界面检查（含翻页/猫头鹰/雁阵新断言）、33 项桌面集成检查全部通过。",
    "",
    "源码：5146199（codex/feishu-focus）。校验文件见 preview.yml（SHA-512）。",
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
  "Pomatez-Focus-v0.1.0-preview.44-win-x64-setup.exe",
  "Pomatez-Focus-v0.1.0-preview.44-win-x64-portable.exe",
  "preview.yml",
]) {
  const out = api([
    "-H", "Content-Type: application/octet-stream",
    "-X", "POST",
    "--data-binary", "@" + path.join(dist, file),
    uploadBase + "?name=" + encodeURIComponent(file),
  ]);
  if (!out.browser_download_url) throw new Error("upload failed for " + file);
  console.log("uploaded:", file, out.size, "bytes");
}
console.log("DONE");
