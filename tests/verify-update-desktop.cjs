// 端到端验证：真实 GitHub Provider + channel preview，检测刚发布的 preview.42。
// 复刻 FocusUpdater 的 NsisUpdater 配置（owner/repo/channel），
// 仅把“当前版本”覆盖为 0.1.0-preview.41，验证线上 Release 可被检测并取到元数据。
const { app } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// 与主进程 updater.ts 相同的目标配置；系统代理由 Chromium 网络栈自动使用
app.commandLine.appendSwitch("proxy-server", "127.0.0.1:7890");
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "farm-update-check-")));

const deadline = setTimeout(() => {
  console.error("TIMEOUT waiting for update check");
  app.exit(2);
}, 60000);

app.whenReady().then(async () => {
  try {
    const { NsisUpdater } = require("electron-updater");
    const updater = new NsisUpdater({
      provider: "github",
      owner: "Luoddu",
      repo: "pomatez-focus",
      channel: "preview",
    });
    updater.logger = null;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = true;
    updater.allowDowngrade = false;
    // dev 模式强制启用，并提供独立缓存目录，避免污染真实安装
    updater.forceDevUpdateConfig = true;
    const dir = app.getPath("userData");
    const configPath = path.join(dir, "dev-app-update.yml");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        provider: "github",
        owner: "Luoddu",
        repo: "pomatez-focus",
        channel: "preview",
        updaterCacheDirName: "pomatez-update-verify",
      })
    );
    updater.updateConfigPath = configPath;
    // 当前版本伪装为 preview.41：若线上 42 可检测，必报 update-available
    updater.app = Object.create(updater.app);
    updater.app.getVersion = () => "0.1.0-preview.41";

    const errors = [];
    updater.on("error", (e) => errors.push(e.message));
    const result = await updater.checkForUpdates();
    const info = result && result.updateInfo;
    console.log(JSON.stringify({
      detectedVersion: info && info.version,
      files: info && info.files && info.files.map((f) => `${f.url} (${f.size}B)`),
      releaseName: info && info.releaseName,
      errors,
    }, null, 2));
    const ok =
      info &&
      info.version === "0.1.0-preview.42" &&
      (info.files || []).some((f) =>
        f.url.includes("Pomatez-Focus-v0.1.0-preview.42-win-x64-setup.exe")
      );
    console.log(ok ? "UPDATE DETECTED: 0.1.0-preview.42 OK" : "UPDATE CHECK FAILED");
    clearTimeout(deadline);
    app.exit(ok ? 0 : 1);
  } catch (e) {
    console.error(e.stack || e);
    clearTimeout(deadline);
    app.exit(1);
  }
});
