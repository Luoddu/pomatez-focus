import { BrowserWindow, screen } from "electron";
import path from "path";
import type { RestState } from "./activitywatch";

export type RestAction = "sleep" | "focus";
type Presentation = { key: string; line: string };

// One short-lived window; never changes the farm's pin or timer ownership.
export class RestReminderWindow {
  private window: BrowserWindow | null = null;
  private current: Presentation | null = null;
  private serial = 0;
  private securedSessions = new WeakSet<Electron.Session>();
  private pending: { id: number; key: string; action: RestAction; resolve: (ok: boolean) => void; timeout: NodeJS.Timeout } | null = null;
  constructor(private directory: string, private headless: boolean,
    private dispatch: (request: { id: number; key: string; action: RestAction }) => void,
    private handled: (key: string, action: RestAction) => void,
    private dismiss: (key: string) => void) {}

  owns(event: Electron.IpcMainInvokeEvent) {
    return !!this.window && !this.window.isDestroyed() &&
      event.sender === this.window.webContents && event.senderFrame === this.window.webContents.mainFrame;
  }
  snapshot() { return this.current ? { ...this.current } : null; }
  update(state: RestState) {
    const reminder = state.settings.supervise && state.status === "recording" ? state.reminder : null;
    if (!reminder) { this.current = null; this.close(); return; }
    this.current = { key: reminder.key, line: reminder.kind === "focus"
      ? `已看 ${reminder.watchedMinutes} 分钟，番茄 ${state.progress?.completedCount ?? reminder.completedCount}/${state.settings.pomodoroGoal}：去睡觉，或回到科研主线。`
      : `已超额 ${reminder.excessMinutes} 分钟：累了去睡觉，或者回到科研主线。` };
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("rest-reminder:state", this.snapshot());
      return;
    }
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const width = Math.min(620, area.width), height = Math.min(260, area.height);
    const popup = this.window = new BrowserWindow({
      title: "科学休息", width, height,
      x: area.x + Math.round((area.width - width) / 2), y: area.y + Math.round((area.height - height) / 2),
      show: false, frame: false, resizable: false, maximizable: false, minimizable: false,
      skipTaskbar: true, backgroundColor: "#ffffff",
      webPreferences: { preload: path.join(this.directory, "rest-reminder-preload.js"),
        contextIsolation: true, nodeIntegration: false, sandbox: true,
        partition: "rest-reminder" },
    });
    popup.setAlwaysOnTop(true, process.platform === "win32" ? "pop-up-menu" : "floating");
    popup.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    popup.webContents.on("will-navigate", event => event.preventDefault());
    const session = popup.webContents.session;
    if (!this.securedSessions.has(session)) {
      session.setPermissionRequestHandler((_web, _permission, callback) => callback(false));
      session.setPermissionCheckHandler(() => false);
      session.on("will-download", (_event, item) => item.cancel());
      this.securedSessions.add(session);
    }
    popup.webContents.on("render-process-gone", () => {
      // Keep the monitor's threshold, dispose the broken native surface. A
      // subsequent healthy state update creates a fresh renderer/window.
      if (this.window === popup) this.close();
    });
    popup.on("close", () => {
      // Alt+F4 dismisses this threshold, without hiding/exiting the farm.
      const key = this.current?.key;
      this.current = null;
      if (key) this.dismiss(key);
    });
    popup.on("closed", () => {
      if (this.window === popup) this.window = null;
      this.cancel();
    });
    popup.once("ready-to-show", () => {
      if (popup.isDestroyed() || this.window !== popup || !this.current) return;
      if (!this.headless) { popup.showInactive(); popup.moveTop(); }
    });
    void popup.loadFile(path.join(this.directory, "assets/rest-reminder.html")).catch(() => {
      if (this.window === popup) this.close();
    });
  }
  async act(value: any) {
    if (!value || (value.action !== "sleep" && value.action !== "focus") ||
      !this.current || value.key !== this.current.key || this.pending)
      throw Error("提醒已变更或正在处理");
    const key = this.current.key, action: RestAction = value.action;
    const ok = await new Promise<boolean>(resolve => {
      const id = ++this.serial;
      this.pending = { id, key, action, resolve, timeout: setTimeout(() => this.cancel(), 8000) };
      try { this.dispatch({ id, key, action }); } catch (_) { this.cancel(); }
    });
    if (!ok) throw Error("操作未完成，请重试");
    // A newer threshold may arrive during IPC; the user's action resolves the
    // displayed alert, including its updated text, without replaying an action.
    this.handled(this.current?.key || key, action);
  }
  complete(value: any) {
    const pending = this.pending;
    if (!pending || value?.id !== pending.id || value?.key !== pending.key || typeof value?.ok !== "boolean")
      throw Error("操作回执无效");
    clearTimeout(pending.timeout); this.pending = null; pending.resolve(value.ok);
  }
  private cancel() {
    if (this.pending) { clearTimeout(this.pending.timeout); this.pending.resolve(false); this.pending = null; }
  }
  close() {
    const popup = this.window;
    this.window = null; this.cancel();
    if (popup && !popup.isDestroyed()) popup.destroy();
  }
}
