import React, { useEffect, useState } from "react";
export default function UpdatePanel() {
  const [state, setState] = useState<any>(null);
  const api = () => (window as any).focusApi;
  useEffect(() => {
    if (!api()?.updateStatus) return;
    api().updateStatus().then(setState).catch(() => {});
    return api().onUpdateState(setState);
  }, []);
  if (!state) return null;
  const call = async (name: string) => {
    try { setState(await api()[name]()); }
    catch { setState((s: any) => ({...s, phase: "error", message: "操作未完成，请重试。"})); }
  };
  const busy = ["checking", "downloading", "installing"].includes(state.phase);
  return <div className="card settings-card" aria-label="软件更新">
    <h3>软件更新</h3>
    <p>当前版本 {state.currentVersion}{state.version && state.phase !== "current" ? ` · 新版本 ${state.version}` : ""}</p>
    {state.phase === "downloading" && <div aria-live="polite">
      <progress aria-label="更新下载进度" max={100} value={state.percent} style={{width: "100%"}} />
      <p>下载中 {Math.floor(state.percent)}%{state.total ? ` · ${(state.transferred / 1048576).toFixed(1)} / ${(state.total / 1048576).toFixed(1)} MB` : ""}</p>
    </div>}
    {state.message && <p role="status">{state.message}</p>}
    <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
      <button className="secondary" disabled={busy || state.phase === "downloaded"} onClick={() => call("checkUpdate")}>{state.phase === "checking" ? "正在检查…" : "检查更新"}</button>
      {state.phase === "available" && <button className="primary" onClick={() => call("downloadUpdate")}>下载更新并重启</button>}
      {state.phase === "downloaded" && <button className="primary" onClick={() => call("installUpdate")}>安装并重启</button>}
    </div>
    <p className="conn-sub">手动检查和下载，下载进度实时显示。当前有专注时会等待你结束后再安装。</p>
  </div>;
}
