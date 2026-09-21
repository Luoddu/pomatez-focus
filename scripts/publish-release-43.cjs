// 创建 preview.43 的 GitHub Release（prerelease）并上传安装包与 preview.yml。
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "app", "electron", "dist");
const TAG = "v0.1.0-preview.43";
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
          "-sS", "-x", PROXY, "--max-time", "600",
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
          "-sS", "--max-time", "600",
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

const payloadPath = path.join(require("node:os").tmpdir(), "release-payload-43.json");
fs.writeFileSync(payloadPath, JSON.stringify({
  tag_name: TAG,
  target_commitish: "5641fc38bf6f88417b52d6b3deb3219f6ff1d815",
  name: "Pomatez Focus 0.1.0-preview.43 · 节气农场与专注统计",
  body: [
    "## 0.1.0-preview.43 节气农场与专注统计",
    "",
    "- 二十四节气：视太阳黄经实时计算交节时刻（2024–2026 与万年历逐日核对），农场按节气换景；标题行节气 pill 展示当前节气、节气第几天与下一节气倒计时；雨水/清明/谷雨落细雨、白露/寒露凝露珠、霜降土壤覆薄霜。",
    "- 专注统计看板（概览标题行「统计」入口）：周/月/季/年四个区间；汇总条（番茄、专注时长、活跃天数、日均、连续收获）；每日/每周/每月收获柱状图；半小时 × 星期时段热力图（跨格专注按时间占比分摊）；任务排行与高光时刻。",
    "- 进行中专注：进度弧随任务象限着色，环内新增「已专注」副行；信息 chips（本轮分钟 / 已积累番茄 / 超时提示）；长任务备注默认折叠 3 行可展开。",
    "- 概览：四张数字卡严格等高；总番茄里程碑进度条改为通栏（已达成档 · 距下一档），不再挤压相邻卡片留白。",
    "- 新增 solarTerms/stats 纯函数模块与 11 项单测；178 项单测、107 项界面检查、33 项桌面集成检查全部通过。",
    "",
    "源码：5641fc3（codex/feishu-focus）。校验文件见 preview.yml（SHA-512）。",
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
  "Pomatez-Focus-v0.1.0-preview.43-win-x64-setup.exe",
  "Pomatez-Focus-v0.1.0-preview.43-win-x64-portable.exe",
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
