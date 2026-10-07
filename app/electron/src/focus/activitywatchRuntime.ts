import { spawn, execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { localRequest } from "./activitywatch";

type RuntimeOptions = {
  allowed?: () => boolean;
  platform?: string;
  probe?: () => Promise<any>;
  candidates?: string[];
  exists?: (file: string) => boolean;
  running?: () => Promise<boolean>;
  launch?: (file: string) => Promise<void>;
  wait?: () => Promise<void>;
};

const installedPaths = () =>
  [
    process.env.LOCALAPPDATA &&
      path.join(
        process.env.LOCALAPPDATA,
        "Programs",
        "ActivityWatch",
        "aw-qt.exe"
      ),
    process.env.ProgramFiles &&
      path.join(process.env.ProgramFiles, "ActivityWatch", "aw-qt.exe"),
    process.env["ProgramFiles(x86)"] &&
      path.join(
        process.env["ProgramFiles(x86)"]!,
        "ActivityWatch",
        "aw-qt.exe"
      ),
  ].filter((p): p is string => !!p);

const launcherRunning = () =>
  new Promise<boolean>((resolve, reject) => {
    execFile(
      path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "tasklist.exe"
      ),
      ["/FI", "IMAGENAME eq aw-qt.exe", "/FO", "CSV", "/NH"],
      { windowsHide: true, timeout: 3000, maxBuffer: 65536 },
      (error, stdout) =>
        error
          ? reject(
              Error("无法核对 ActivityWatch 进程；请手动启动后刷新")
            )
          : resolve(/"aw-qt\.exe"/i.test(stdout))
    );
  });
const launchInstalled = (file: string) =>
  new Promise<void>((resolve, reject) => {
    // AW's official tray manager owns its three collectors. It stays independent
    // of the farm, so no stdio pipes or farm exit cleanup control its descendants.
    const child = spawn(file, [], {
      cwd: path.dirname(file),
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", () =>
      reject(Error("ActivityWatch 启动失败，请手动启动后刷新"))
    );
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });

export class ActivityWatchRuntime {
  private busy: Promise<void> | null = null;
  private options: RuntimeOptions;
  constructor(options: RuntimeOptions = {}) {
    this.options = options;
  }
  ensure(): Promise<void> {
    if (this.busy) return this.busy;
    this.busy = this.check().finally(() => {
      this.busy = null;
    });
    return this.busy;
  }
  private async check() {
    const o = this.options;
    const active = () => {
      if (o.allowed && !o.allowed())
        throw Error("ActivityWatch 检测已暂停");
    };
    active();
    const probe =
      o.probe || (() => localRequest("/info", undefined, 5600, 1500));
    const ready = async () => {
      try {
        const info = await probe();
        return (
          typeof info?.version === "string" &&
          typeof info?.hostname === "string"
        );
      } catch (_) {
        return false;
      }
    };
    const available = await ready();
    active();
    if (available) return;
    if ((o.platform || process.platform) !== "win32")
      throw Error("请启动本机 ActivityWatch 后刷新");
    const running = await (o.running || launcherRunning)();
    active();
    if (running)
      throw Error(
        "ActivityWatch 已在运行，接口未连接；请检查托盘中的采集器，再点刷新"
      );
    const file = (o.candidates || installedPaths()).find(
      o.exists || existsSync
    );
    if (!file)
      throw Error(
        "未找到已安装的 ActivityWatch，请手动启动或安装后刷新"
      );
    await (o.launch || launchInstalled)(file);
    for (let i = 0; i < 12; i++) {
      await (
        o.wait ||
        (() => new Promise<void>((resolve) => setTimeout(resolve, 500)))
      )();
      active();
      const available = await ready();
      active();
      if (available) return;
    }
    throw Error("ActivityWatch 已启动，接口尚未就绪；请稍后再点刷新");
  }
}
