// 创建 preview.46 的 GitHub Release（prerelease）并上传安装包与 preview.yml。
// 本机代理对 curl schannel 的大 POST 极不稳定：Release 创建与资产上传
// 一律走 scripts/upload-asset-socks5.py 的 Python OpenSSL + SOCKS5 通道。
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "app", "electron", "dist-preview46");
const TAG = "v0.1.0-preview.46";
const COMMIT = "f5583c1a70e8b37d6decd9260a7729f7aaf3274e";

const token = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
})
  .split("\n")
  .find((l) => l.startsWith("password="))
  .slice("password=".length);
if (!token) throw new Error("no github token from credential helper");

const payload = {
  tag_name: TAG,
  target_commitish: COMMIT,
  name: "Pomatez Focus 0.1.0-preview.46 · 分享卡片",
  body: [
    "## 0.1.0-preview.46 分享卡片",
    "",
    "**重要修复：preview.45 安装包启动崩溃已修复。** 根因是构建时 updater 打包步骤静默失败，asar 里混入未打包输出；已加构建护栏（产物过小或含裸 require 即中止构建）并在发布前做 asar 级验证。装着 45 的设备请直接下载本版覆盖安装，数据目录不受影响。",
    "",
    "### 新功能：统计页分享卡片",
    "",
    "- 统计页标题栏新增「📸 分享」：一键导出当前区间的成就图 PNG（1080×1520）。",
    "- 卡片内容：番茄农场品牌头 + 节气 pill、番茄主数字与专注时长、收获柱状图（成就色：红系渐深、金系渐耀）、7×24 时段热力、时段偏好与象限分布、累计收获里程碑进度条。",
    "- 隐私安全：卡片只呈现数字与颜色，不含任何任务名，可放心分享。",
    "- 188 项单测、110 项界面检查、33 项桌面集成检查全部通过。",
    "",
    `源码：${COMMIT.slice(0, 7)}（codex/feishu-focus）。校验文件见 preview.yml（SHA-512）。`,
  ].join("\n"),
  draft: false,
  prerelease: true,
  generate_release_notes: false,
};

const payloadPath = path.join(require("node:os").tmpdir(), "release-payload-46.json");
fs.writeFileSync(payloadPath, JSON.stringify(payload));

// 创建 Release（Python 通道，自动重试）
const createScript = `
import json, os, ssl, sys, time
sys.path.insert(0, ${JSON.stringify(path.join(root, "scripts"))})
from importlib import import_module
up = import_module("upload-asset-socks5")
token = os.environ["GITHUB_TOKEN"]
payload = open(${JSON.stringify(payloadPath)}, encoding="utf-8").read().encode()
for attempt in range(1, 9):
    try:
        sock = up.socks5_connect("api.github.com", 443, timeout=30)
        sock.settimeout(60)
        tls = ssl.create_default_context().wrap_socket(sock, server_hostname="api.github.com")
        hdr = ("POST /repos/Luoddu/pomatez-focus/releases HTTP/1.1\\r\\n"
               "Host: api.github.com\\r\\nAuthorization: Bearer " + token + "\\r\\n"
               "User-Agent: kimi-upload/1.0\\r\\nAccept: application/vnd.github+json\\r\\n"
               "Content-Type: application/json\\r\\nContent-Length: " + str(len(payload)) + "\\r\\n"
               "Connection: close\\r\\n\\r\\n")
        tls.sendall(hdr.encode() + payload)
        resp = b""
        while True:
            d = tls.recv(65536)
            if not d: break
            resp += d
        head, _, body = resp.partition(b"\\r\\n\\r\\n")
        status = int(head.split(b" ")[1])
        if status in (200, 201):
            d = json.loads(body)
            print(json.dumps({"id": d["id"], "url": d["html_url"]}))
            sys.exit(0)
        print(f"attempt {attempt}: HTTP {status} {body[:200]!r}", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"attempt {attempt}: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
    time.sleep(3)
sys.exit(1)
`;
const created = spawnSync("python", ["-c", createScript], {
  encoding: "utf8",
  env: { ...process.env, GITHUB_TOKEN: token },
  maxBuffer: 16 * 1024 * 1024,
});
process.stderr.write(created.stderr || "");
if (created.status !== 0) throw new Error("release create failed");
const release = JSON.parse(created.stdout.trim().split("\n").pop());
console.log("release created:", release.url, "id:", release.id);

// 上传三个资产
for (const file of [
  "Pomatez-Focus-v0.1.0-preview.46-win-x64-setup.exe",
  "Pomatez-Focus-v0.1.0-preview.46-win-x64-portable.exe",
  "preview.yml",
]) {
  const up = spawnSync(
    "python",
    [
      path.join(root, "scripts", "upload-asset-socks5.py"),
      path.join(dist, file),
      file,
      String(release.id),
    ],
    { encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: token } }
  );
  process.stdout.write(up.stdout || "");
  process.stderr.write(up.stderr || "");
  if (up.status !== 0) throw new Error("upload failed for " + file);
}
console.log("DONE");
