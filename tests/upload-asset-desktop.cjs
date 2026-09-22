// 用 Electron 的 Chromium 网络栈上传 Release 资产（curl 的 schannel 栈在
// 本机代理下反复在大文件 POST 上卡死；Chromium 走同一代理却稳定）。
const { app, net } = require("electron");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const [file, url] = process.argv.slice(2);
if (!file || !url) {
  console.error("usage: electron upload-asset-desktop.cjs <file> <url>");
  app.exit(2);
}
app.commandLine.appendSwitch("proxy-server", "127.0.0.1:7890");

const token = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
})
  .split("\n")
  .find((l) => l.startsWith("password="))
  .slice("password=".length);

const deadline = setTimeout(() => {
  console.error("TIMEOUT uploading asset");
  app.exit(2);
}, 480000);

app.whenReady().then(() => {
  const data = fs.readFileSync(file);
  const req = net.request({ method: "POST", url });
  req.setHeader("Authorization", `Bearer ${token}`);
  req.setHeader("Content-Type", "application/octet-stream");
  req.setHeader("User-Agent", "pomatez-release");
  req.on("response", (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log("HTTP", res.statusCode);
      try {
        const d = JSON.parse(body);
        console.log("asset:", d.name, d.size, d.state);
        clearTimeout(deadline);
        app.exit(d.state === "uploaded" ? 0 : 1);
      } catch {
        console.log(body.slice(0, 300));
        clearTimeout(deadline);
        app.exit(1);
      }
    });
  });
  req.on("error", (e) => {
    console.error("request error:", e.message);
    clearTimeout(deadline);
    app.exit(1);
  });
  req.write(data);
  req.end();
});
