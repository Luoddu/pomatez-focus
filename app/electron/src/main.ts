// Desktop window/tray lifecycle adapted from Pomatez v1.11.0.
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  shell,
  powerMonitor,
  screen,
} from "electron";
import path from "path";
import fs from "fs";
import { FocusService } from "./focus/service";
import { FocusUpdater } from "./focus/updater";
const headless = process.env.POMATEZ_HEADLESS === "1";
app.setName("Pomatez Focus");
app.setPath(
  "userData",
  process.env.POMATEZ_PROFILE ||
    path.join(app.getPath("appData"), "pomatez-focus")
);
app.setAppUserModelId("io.github.luoddu.pomatezfocus");
// 合成提示音需在无人值守的到点时刻也能出声（无媒体文件，仅 Web Audio）
app.commandLine.appendSwitch(
  "autoplay-policy",
  "no-user-gesture-required"
);
const single = app.requestSingleInstanceLock();
let win: BrowserWindow | null = null,
  tray: Tray | null = null,
  quitting = false;
const service = new FocusService();
// 生成进度：真实阶段事件从 service 转发到渲染层（窗口未就绪时丢弃即可，
// 渲染层的初始「正在连接飞书…」不依赖该通道）
service.onGenerateProgress = (p) =>
  win?.webContents.send("focus:generate-progress", p);
const show = () => {
  if (!headless && win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
};
const handler = (name: string, fn: (value: any) => any) =>
  ipcMain.handle(`focus:${name}`, async (event, value) => {
    if (
      !win ||
      event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame
    )
      throw new Error("Untrusted sender");
    try {
      return { ok: true, value: await fn(value) };
    } catch (e: any) {
      return { ok: false, error: e.message || "操作失败" };
    }
  });
if (!single) app.quit();
else {
  Menu.setApplicationMenu(null);
  app.on("second-instance", show);
  app
    .whenReady()
    .then(async () => {
      const area = screen.getPrimaryDisplay().workAreaSize;
      const portrait = area.height > area.width;
      // Portrait monitors get a taller, narrower window and lower minimums so
      // half-screen tiling stays usable; landscape behavior is unchanged.
      const expandedMinWidth = portrait ? 600 : 760;
      const expandedMinHeight = portrait ? 520 : 580;
      let compactMode = false;
      let expandedBounds: Electron.Rectangle | null = null;
      let expandedMaximized = false;
      win = new BrowserWindow({
        width: portrait
          ? Math.min(920, area.width)
          : Math.min(1040, area.width),
        height: portrait
          ? Math.min(1500, area.height)
          : Math.min(800, area.height),
        minWidth: expandedMinWidth,
        minHeight: expandedMinHeight,
        resizable: true,
        maximizable: true,
        minimizable: true,
        show: false,
        frame: true,
        alwaysOnTop: false,
        backgroundColor: "#f8faff",
        icon: path.join(__dirname, "assets/logo-dark.ico"),
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          backgroundThrottling: false,
        },
      });
      win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      win.webContents.on("will-navigate", (e) => e.preventDefault());
      win.webContents.session.setPermissionRequestHandler(
        (_web, _permission, callback) => callback(false)
      );
      win.webContents.session.setPermissionCheckHandler(() => false);
      win.webContents.session.on("will-download", (_event, item) => {
        if (!item.getURL().startsWith("blob:file:")) {
          item.cancel();
          return;
        }
        const file = path.join(
          app.getPath("downloads"),
          `focus-records-${Date.now()}.json`
        );
        if (fs.existsSync(file)) {
          item.cancel();
          return;
        }
        item.setSavePath(file);
      });
      handler("status", () => service.status());
      handler("configure", (value) => service.configure(value));
      handler("today", () => service.today());
      handler("generateToday", () => service.generateToday());
      handler("adjustToday", (value) => service.adjustToday(value));
      handler("createQuickTask", (value) =>
        service.createQuickTask(value)
      );
      handler("correctRecord", (value) => service.correctRecord(value));
      handler("completeToday", (value) => service.completeToday(value));
      handler("setup", () => service.setup());
      handler("sync", (value) => service.sync(value));
      handler("history", () => service.history());
      handler("classifyHistory", () => service.classifyHistory());
      handler("archiveHistory", (value) =>
        service.archiveHistory(value)
      );
      handler("backupHistory", (value) => service.backupHistory(value));
      const installUpdate = async () => {
        if (updater.status().phase !== "downloaded")
          return updater.status();
        const snapshot = await win!.webContents
          .executeJavaScript(`(() => {
          const value = JSON.parse(localStorage.getItem('pomatez-focus-v1') || '{}');
          if (value.active) return null;
          document.documentElement.inert = true;
          return value;
        })()`);
        if (!snapshot) {
          updater.defer();
          return updater.status();
        }
        try {
          const backups = path.join(app.getPath("userData"), "backups");
          fs.mkdirSync(backups, { recursive: true });
          fs.writeFileSync(
            path.join(backups, `before-update-${Date.now()}.json`),
            JSON.stringify(snapshot),
            { flag: "wx" }
          );
          updater.install();
        } finally {
          if (
            updater.status().phase !== "installing" &&
            win &&
            !win.isDestroyed()
          )
            await win.webContents.executeJavaScript(
              "document.documentElement.inert = false"
            );
        }
        return updater.status();
      };
      const updater = new FocusUpdater(
        (state) => {
          if (win && !win.isDestroyed())
            win.webContents.send("focus:update-state", state);
        },
        async () => {
          await installUpdate();
        }
      );
      handler("updateStatus", () => updater.status());
      handler("checkUpdate", () => updater.check());
      handler("downloadUpdate", () => updater.download());
      handler("installUpdate", installUpdate);
      handler("windowState", () => ({
        compact: compactMode,
        pinned: win!.isAlwaysOnTop(),
      }));
      handler("windowMode", (value) => {
        if (
          typeof value?.compact !== "boolean" ||
          typeof value?.pinned !== "boolean"
        )
          throw new Error("Invalid window mode");
        // Expanded windows must yield to other applications. On Windows the
        // default floating level is repositioned behind the taskbar on focus;
        // use the documented non-taskbar-relative level for the compact timer.
        const shouldPin = value.compact && value.pinned;
        if (!shouldPin) win!.setAlwaysOnTop(false);
        if (value.compact !== compactMode) {
          if (value.compact) {
            expandedBounds = win!.getNormalBounds();
            expandedMaximized = win!.isMaximized();
            if (expandedMaximized) win!.unmaximize();
            win!.setMinimumSize(360, 220);
            win!.setSize(360, 220);
            win!.setResizable(false);
            win!.setMaximizable(false);
          } else {
            win!.setResizable(true);
            win!.setMaximizable(true);
            win!.setMinimumSize(expandedMinWidth, expandedMinHeight);
            if (expandedBounds) win!.setBounds(expandedBounds);
            if (expandedMaximized) win!.maximize();
          }
          compactMode = value.compact;
        }
        if (shouldPin)
          win!.setAlwaysOnTop(
            true,
            process.platform === "win32" ? "pop-up-menu" : "floating"
          );
        return { compact: value.compact, pinned: win!.isAlwaysOnTop() };
      });
      handler("minimize", () => {
        if (!headless) win?.minimize();
      });
      handler("hide", () => win?.hide());
      handler("remind", () => {
        if (!headless) shell.beep();
      });
      win.on("close", (event) => {
        if (!quitting) {
          event.preventDefault();
          win?.hide();
        }
      });
      win.on("closed", () => {
        win = null;
      });
      powerMonitor.on("suspend", () =>
        win?.webContents.send("focus:suspend")
      );
      powerMonitor.on("resume", () =>
        win?.webContents.send("focus:suspend")
      );
      if (!headless) {
        tray = new Tray(path.join(__dirname, "assets/tray-dark.png"));
        tray.setToolTip("番茄农场 · 点击恢复");
        tray.setContextMenu(
          Menu.buildFromTemplate([
            { label: "显示番茄小窗", click: show },
            {
              label: "退出（保留专注）",
              click: () => {
                quitting = true;
                app.quit();
              },
            },
          ])
        );
        tray.on("click", () =>
          win?.isVisible() ? win.hide() : show()
        );
      }
      win.once("ready-to-show", show);
      await win.loadFile(path.join(__dirname, "index.html"));
      if (headless && process.env.POMATEZ_SMOKE_TEST === "1") {
        if (
          win.isVisible() ||
          !(await win.webContents.executeJavaScript(
            "Boolean(document.querySelector('.focus-app'))"
          ))
        )
          throw new Error("Smoke check failed");
        console.log("Pomatez Focus ready (hidden)");
        quitting = true;
        app.quit();
      }
    })
    .catch(() => {
      console.error(
        "Desktop startup failed. Check the installed application files."
      );
      app.exit(1);
    });
}
app.on("before-quit", () => {
  quitting = true;
});
app.on("window-all-closed", () => app.quit());
app.on("activate", show);
