// Desktop window/tray lifecycle adapted from Pomatez v1.11.0.
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  shell,
  powerMonitor,
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
      win = new BrowserWindow({
        width: 560,
        height: 760,
        minWidth: 340,
        minHeight: 180,
        resizable: true,
        maximizable: false,
        show: false,
        frame: false,
        alwaysOnTop: true,
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
      handler("setup", () => service.setup());
      handler("sync", (value) => service.sync(value));
      handler("windowMode", (value) => {
        if (
          typeof value?.compact !== "boolean" ||
          typeof value?.pinned !== "boolean"
        )
          throw new Error("Invalid window mode");
        win!.setAlwaysOnTop(value.pinned);
        win!.setResizable(!value.compact);
        win!.setMinimumSize(340, value.compact ? 180 : 500);
        win!.setSize(
          value.compact ? 340 : 560,
          value.compact ? 180 : 760
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
        tray.setToolTip("Pomatez Focus · 点击恢复");
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
