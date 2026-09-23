import { contextBridge, ipcRenderer } from "electron";
const invoke = async (name: string, value?: any) => {
  const reply = await ipcRenderer.invoke(`focus:${name}`, value);
  if (!reply?.ok) throw new Error(reply?.error || "操作失败");
  return reply.value;
};
contextBridge.exposeInMainWorld("focusApi", {
  status: () => invoke("status"),
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
  createQuickTask: (value: any) => invoke("createQuickTask", value),
  correctRecord: (value: any) => invoke("correctRecord", value),
  completeToday: (value: any) => invoke("completeToday", value),
  configure: (value: any) => invoke("configure", value),
  setup: () => invoke("setup"),
  sync: (value: any) => invoke("sync", value),
  history: () => invoke("history"),
  classifyHistory: () => invoke("classifyHistory"),
  archiveHistory: (value: any) => invoke("archiveHistory", value),
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
