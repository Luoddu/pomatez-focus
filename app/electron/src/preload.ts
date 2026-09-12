import { contextBridge, ipcRenderer } from "electron";
const invoke = async (name: string, value?: any) => {
  const reply = await ipcRenderer.invoke(`focus:${name}`, value);
  if (!reply?.ok) throw new Error(reply?.error || "操作失败");
  return reply.value;
};
contextBridge.exposeInMainWorld("focusApi", {
  status: () => invoke("status"),
  today: () => invoke("today"),
  generateToday: () => invoke("generateToday"),
  adjustToday: (value: any) => invoke("adjustToday", value),
  completeToday: (value: any) => invoke("completeToday", value),
  configure: (value: any) => invoke("configure", value),
  setup: () => invoke("setup"),
  sync: (value: any) => invoke("sync", value),
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
});
