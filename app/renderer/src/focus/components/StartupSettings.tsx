import React,{useEffect,useState} from "react";
import { api } from "./shared";

type State={supported:boolean;enabled:boolean;registered:boolean;blocked:boolean;conflict:boolean;message:string};
export default function StartupSettings(){
  const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    let live=true;
    const read=()=>{if(!api()?.startupStatus){setError("请更新桌面版后设置");return;}api().startupStatus().then((v:State)=>{if(live){setState(v);setError("");}}).catch((e:Error)=>{if(live)setError(e.message);});};
    read();window.addEventListener("focus",read);return ()=>{live=false;window.removeEventListener("focus",read);};
  },[]);
  const toggle=async()=>{
    if(!state || busy)return;setBusy(true);setError("");
    try{setState(await api().startupSet(!state.enabled));}
    catch(e){setError((e as Error).message);try{setState(await api().startupStatus());}catch(_){} }
    finally{setBusy(false);}
  };
  return <div className="card settings-card s-startup"><h3>开机自启动</h3>
    <div className="sync-row"><span className="sync-text">登录 Windows 后启动番茄农场</span><div className="spacer" />
      <button type="button" className={`btn-small outline${state?.enabled ? " on" : ""}`} role="switch" aria-label="开机自启动" aria-checked={state?.enabled || false} disabled={busy || !state?.supported || state?.conflict} onClick={toggle}>{busy ? "保存中…" : !state ? "读取中…" : state.enabled ? "已开启" : "已关闭"}</button>
    </div>
    <p className="field-hint" role="status">{state?.message}</p>
    {error && <p className="weekgoal-error" role="alert">{error}</p>}
    <p className="field-hint">启动后驻留托盘，不抢占桌面。双击托盘图标打开。仅对本机生效。</p>
  </div>;
}
