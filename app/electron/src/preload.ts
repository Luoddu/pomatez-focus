import { contextBridge, ipcRenderer } from "electron";
const invoke = async (name: string, value?: any) => {
  const reply = await ipcRenderer.invoke(`focus:${name}`, value);
  if (!reply?.ok) throw new Error(reply?.error || "操作失败");
  return reply.value;
};
contextBridge.exposeInMainWorld("focusApi", {
  nativeRestReminder: true,
  restActionResult: (value: any) => invoke("restActionResult", value),
  onRestAction: (callback: (request: any) => void) => {
    const listener = (_event: any, request: any) => callback(request);
    ipcRenderer.on("focus:rest-action", listener);
    return () => ipcRenderer.removeListener("focus:rest-action", listener);
  },
  status: () => invoke("status"),
  restState: () => invoke("restState"),
  restRefresh: () => invoke("restRefresh"),
  restSettings: (value: any) => invoke("restSettings", value),
  restProgress: (value: { day: string; completedCount: number | null }) => invoke("restProgress", value),
  restStatistics: (value: "today" | "week") => invoke("restStatistics", value),
  restAcknowledge: (value: string) => invoke("restAcknowledge", value),
  onRestState: (callback: (state: any) => void) => {
    const listener = (_event: any, state: any) => callback(state);
    ipcRenderer.on("focus:rest-state", listener);
    return () => ipcRenderer.removeListener("focus:rest-state", listener);
  },
  updateStatus: () => invoke("updateStatus"),
  checkUpdate: () => invoke("checkUpdate"),
  downloadUpdate: () => invoke("downloadUpdate"),
  installUpdate: () => invoke("installUpdate"),
  onUpdateState: (callback: (state: any) => void) => {
    const listener = (_event: any, state: any) => callback(state);
    ipcRenderer.on("focus:update-state", listener);
    return () =>
      ipcRenderer.removeListener("focus:update-state", listener);
  },
  today: () => invoke("today"),
  generateToday: () => invoke("generateToday"),
  adjustToday: (value: any) => invoke("adjustToday", value),
  removePlan: (value: any) => invoke("removePlan", value),
  projects: () => invoke("projects"),
  createQuickTask: (value: any) => invoke("createQuickTask", value),
  correctRecord: (value: any) => invoke("correctRecord", value),
  recolorRecord: (value: any) => invoke("recolorRecord", value),
  dailyReviews: () => invoke("dailyReviews"),
  completeToday: (value: any) => invoke("completeToday", value),
  configure: (value: any) => invoke("configure", value),
  setup: () => invoke("setup"),
  sync: (value: any) => invoke("sync", value),
  history: () => invoke("history"),
  classifyHistory: () => invoke("classifyHistory"),
  archiveHistory: (value: any) => invoke("archiveHistory", value),
  journal: () => invoke("journal"),
  saveJournal: (value: any) => invoke("saveJournal", value),
  backupHistory: (value: any) => invoke("backupHistory", value),
  windowMode: (value: any) => invoke("windowMode", value),
  windowState: () => invoke("windowState"),
  minimize: () => invoke("minimize"),
  hide: () => invoke("hide"),
  remind: () => invoke("remind"),
  onSuspend: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("focus:suspend", listener);
    return () => ipcRenderer.removeListener("focus:suspend", listener);
  },
  onGenerateProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on("focus:generate-progress", listener);
    return () =>
      ipcRenderer.removeListener("focus:generate-progress", listener);
  },
});
