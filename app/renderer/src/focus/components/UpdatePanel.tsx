import React, { useContext, useEffect, useState } from "react";
import { CounterContext } from "contexts/CounterContext";
export default function UpdatePanel() {
  const [state, setState] = useState<any>(null);
  const timer=useContext(CounterContext);
  const [restarting,setRestarting]=useState(false),[restartError,setRestartError]=useState("");
  const api = () => (window as any).focusApi;
  useEffect(() => {
    if (!api()?.updateStatus) return;
    const refresh=()=>api().updateStatus().then(setState).catch(() => {});
    refresh();window.addEventListener("focus",refresh);
    const off=api().onUpdateState(setState);
    return ()=>{window.removeEventListener("focus",refresh);off();};
  }, []);
  if (!state) return null;
  const call = async (name: string) => {
    try { setState(await api()[name]()); }
    catch { setState((s: any) => ({...s, phase: "error", message: "操作未完成，请重试。"})); }
  };
  const busy = ["checking", "downloading", "installing"].includes(state.phase);
  return <div className="card settings-card s-update" aria-label="软件更新">
    <h3>软件更新</h3>
    <p>当前版本 {state.currentVersion}{state.version && state.phase !== "current" ? ` · 新版本 ${state.version}` : ""}</p>
    {state.phase === "downloading" && <div aria-live="polite">
      <progress aria-label="更新下载进度" max={100} value={state.percent} style={{width: "100%"}} />
      <p>下载中 {Math.floor(state.percent)}%{state.total ? ` · ${(state.transferred / 1048576).toFixed(1)} / ${(state.total / 1048576).toFixed(1)} MB` : ""}</p>
    </div>}
    {state.message && <p role="status">{state.message}</p>}
    {state.localUpdate?.available&&<p role="status">本机已准备 {state.localUpdate.version}，无需远端下载。</p>}
    {(restartError||state.localUpdate?.error)&&<p role="alert">{restartError||state.localUpdate.error}</p>}
    <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
      <button className="secondary" disabled={busy || state.phase === "downloaded"} onClick={() => call("checkUpdate")}>{state.manual ? "查看 Mac 月度版本" : state.phase === "checking" ? "正在检查…" : "检查更新"}</button>
      {state.phase === "available" && <button className="primary" onClick={() => call("downloadUpdate")}>下载更新并重启</button>}
      {state.phase === "downloaded" && <button className="primary" onClick={() => call("installUpdate")}>安装并重启</button>}
      <button className="secondary" disabled={busy||restarting} onClick={async()=>{
        setRestarting(true);setRestartError("");try{timer.pause();await api().restartApp();}catch(e:any){setRestartError(e.message||"重启未完成，当前App仍可用");setRestarting(false);}
      }}>{restarting?"正在保存并重启…":state.localUpdate?.available?"重启以加载更新":"重启app"}</button>
    </div>
    <p className="conn-sub">{state.manual ? "个人试用版未公证，采用手动安装；与 Windows 更新通道独立。更新前请先保存当前专注。" : "远端更新仍可手动检查下载。本地更新与重启会先暂停并保存当前专注，重启后可继续。"}</p>
  </div>;
}
