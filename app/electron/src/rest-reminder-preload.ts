import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("restReminderApi", {
  state: () => ipcRenderer.invoke("rest-reminder:state"),
  act: (value: { key: string; action: "sleep" | "focus" | "gym" }) => ipcRenderer.invoke("rest-reminder:act", value),
  onState: (callback: (value: any) => void) => {
    const listener = (_event: any, value: any) => callback(value);
    ipcRenderer.on("rest-reminder:state", listener);
    return () => ipcRenderer.removeListener("rest-reminder:state", listener);
  },
});
