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
const headless = process.env.POMATEZ_HEADLESS === "1";
app.setName("Pomatez Focus");
app.setPath(
  "userData",
  process.env.POMATEZ_PROFILE ||
    path.join(app.getPath("appData"), "pomatez-focus")
);
app.setAppUserModelId("io.github.luoddu.pomatezfocus");
const single = app.requestSingleInstanceLock();
let win: BrowserWindow | null = null,
  tray: Tray | null = null,
  quitting = false;
const service = new FocusService();
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
      let compactMode = false;
      let expandedBounds: Electron.Rectangle | null = null;
      let expandedMaximized = false;
      win = new BrowserWindow({
        width: Math.min(1040, area.width),
        height: Math.min(800, area.height),
        minWidth: 760,
        minHeight: 580,
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
      handler("completeToday", (value) => service.completeToday(value));
      handler("setup", () => service.setup());
      handler("sync", (value) => service.sync(value));
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
            win!.setMinimumSize(760, 580);
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
