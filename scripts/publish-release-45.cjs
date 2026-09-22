// 创建 preview.45 的 GitHub Release（prerelease）并上传安装包与 preview.yml。
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
// dist 被本机 Kimi 桌面进程持锁，打包输出在备用目录 dist-preview45b
const dist = path.join(root, "app", "electron", "dist-preview45b");
const TAG = "v0.1.0-preview.45";
const PROXY = "http://127.0.0.1:7890";

const token = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
})
  .split("\n")
  .find((l) => l.startsWith("password="))
  .slice("password=".length);
if (!token) throw new Error("no github token from credential helper");

const api = (args) => {
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

const payloadPath = path.join(require("node:os").tmpdir(), "release-payload-45.json");
fs.writeFileSync(payloadPath, JSON.stringify({
  tag_name: TAG,
  target_commitish: "427a32df2eb3e784c73955a6603ade11804152d8",
  name: "Pomatez Focus 0.1.0-preview.45 · 统计页改版",
  body: [
    "## 0.1.0-preview.45 统计页改版",
    "",
    "- 时段热力：48 格扁长半小时格 → 7×24 小时格，加高加大圆角，阅读更清爽；悬浮仍显示该小时收获。",
    "- 柱状图成就色连续化：撤掉「1–4 / 5–9 小丰收 / ≥10 大丰收」文字图例——1–9 个在番茄红谱系内越收越深，≥10 个进入金色谱系且收得越多金色越亮、光晕越大，颜色自己说话。",
    "- 隐私安全：任务排行下线（截图分享会暴露任务名），替换为「象限分布」（只统计各象限投入番茄数与占比）；新增「时段偏好」板块（深夜/上午/下午/晚间），与「高光时刻」组成三卡行。",
    "- 页面更紧凑：整体一屏基本看完，不用滚动。",
    "- 「已收 x/y」回到任务行尾右侧，文字在上、红色记数格在下，不再压住番茄筹码。",
    "- 计时页极简：去掉「额外时间 · 等待你确认」和「本轮分钟 / 已积累 / 多计时」提示条；攒满一个番茄后才亮出「已专注 X」，此前保持安静。",
    "- 农场动物减速：蝴蝶、大雁飞行更从容。",
    "- 182 项单测、109 项界面检查、33 项桌面集成检查全部通过。",
    "",
    "源码：427a32d（codex/feishu-focus）。校验文件见 preview.yml（SHA-512）。",
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
  "Pomatez-Focus-v0.1.0-preview.45-win-x64-setup.exe",
  "Pomatez-Focus-v0.1.0-preview.45-win-x64-portable.exe",
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
