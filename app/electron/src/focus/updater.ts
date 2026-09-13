import { NsisUpdater } from "electron-updater";
import { app } from "electron";

export type UpdateState = {
  phase: "idle" | "checking" | "available" | "current" | "downloading" | "downloaded" | "installing" | "error";
  currentVersion: string;
  version?: string;
  percent: number;
  transferred?: number;
  total?: number;
  message?: string;
};
// Official NSIS lifecycle; no credentials, alternate feed URLs, or shell update scripts.
export class FocusUpdater {
  private updater: any;
  private busy = false;
  private state: UpdateState;
  constructor(private publish: (s: UpdateState) => void, private ready: () => Promise<void>, updater?: any, version = app.getVersion()) {
    this.updater = updater || new NsisUpdater({provider: "github", owner: "Luoddu", repo: "pomatez-focus", channel: "preview"});
    this.state = {phase: "idle", currentVersion: version, percent: 0};
    this.updater.autoDownload = false;
    this.updater.autoInstallOnAppQuit = false;
    this.updater.allowPrerelease = true;
    this.updater.allowDowngrade = false;
    this.updater.disableWebInstaller = true;
    this.updater.disableDifferentialDownload = true;
    this.updater.logger = null;
    this.updater.on("error", () => this.set({phase: "error", message: "更新未完成，请检查网络后重试；当前版本仍可使用。"}));
    this.updater.on("update-available", (info: any) => this.set({phase: "available", version: info.version, percent: 0, message: undefined}));
    this.updater.on("update-not-available", () => this.set({phase: "current", percent: 0, message: "已是最新版本"}));
    this.updater.on("download-progress", (p: any) => this.set({phase: "downloading", percent: Math.max(0, Math.min(100, Number(p.percent) || 0)), transferred: p.transferred, total: p.total}));
  }
  private set(patch: Partial<UpdateState>) { this.state = {...this.state, ...patch}; this.publish(this.status()); }
  status() { return {...this.state}; }
  async check() {
    if (this.busy || ["downloaded", "installing"].includes(this.state.phase)) return this.status();
    this.busy = true; this.set({phase: "checking", message: undefined});
    try {
      const result = await this.updater.checkForUpdates();
      if (result === null && this.state.phase === "checking") this.set({phase: "error", message: "开发预览不支持安装更新，请在已打包的应用中检查。"});
    }
    catch { this.set({phase: "error", message: "无法检查更新，请检查网络后重试。"}); }
    finally { this.busy = false; }
    return this.status();
  }
  async download() {
    if (this.busy || this.state.phase !== "available") return this.status();
    this.busy = true; this.set({phase: "downloading", percent: 0, message: undefined});
    try {
      const files = await this.updater.downloadUpdate();
      if (!files?.length) throw Error("No verified installer");
      this.set({phase: "downloaded", percent: 100, message: "下载完成，准备安装"});
      await this.ready();
    } catch { this.set({phase: "error", message: "下载或校验失败，未安装更新；请重新检查更新。"}); }
    finally { this.busy = false; }
    return this.status();
  }
  defer() { this.set({message: "更新已下载；请先结束或放弃当前专注，再点击安装并重启。"}); }
  install() {
    if (this.state.phase !== "downloaded") return;
    this.set({phase: "installing", message: "正在安装，完成后自动重启…"});
    this.updater.quitAndInstall(true, true);
  }
}
