import React from "react";
import { PREFERENCE_LABELS, PreferenceKey, preferenceJSON } from "../preferences";
import { PreferenceSyncStatus } from "../preferenceSync";
import { preferenceDifferences } from "../preferenceDiff";

export default function PreferenceSyncSettings({ status, connected, onSync, onEnable, onDisable, onResolve, timer, onTimer }: {
  status: PreferenceSyncStatus; connected: boolean; onSync: () => void; onEnable: () => void; onDisable: () => void;
  onResolve: (key: PreferenceKey, entryId?: string) => void;
  timer: {focusMinutes:number;restMinutes:number};onTimer:(value:any)=>void;
}) {
  return <div className="card settings-card s-preferences">
    <h3>全局偏好</h3>
    <p className="field-hint">同一份飞书表格共用番茄比例、周目标、科研目标、计时时长和科学休息规则。</p>
    <div className="weight-fields">
      <label className="weight-field"><span>默认番茄时长</span><input aria-label="默认番茄时长" type="number" min={1} max={180} value={timer.focusMinutes} onChange={e=>onTimer({...timer,focusMinutes:Number(e.target.value)})} /> 分钟</label>
      <label className="weight-field"><span>休息时长</span><input aria-label="休息时长" type="number" min={1} max={60} value={timer.restMinutes} onChange={e=>onTimer({...timer,restMinutes:Number(e.target.value)})} /> 分钟</label>
    </div>
    <p role="status" className="field-hint">{connected ? status.message : "连接飞书后可同步，本机设置仍可使用"}{status.pending>0 ? ` · ${status.pending} 项待同步` : ""}</p>
    <div className="sync-row">
      <button className="btn-small outline" disabled={!connected || status.syncing} onClick={status.enabled ? onSync : onEnable}>{status.syncing ? "同步中…" : status.enabled ? "立即同步偏好" : "启用偏好同步"}</button>
      {status.enabled && <button className="btn-small outline" disabled={status.syncing} onClick={onDisable}>暂停同步</button>}
    </div>
    {status.conflicts.map(c=>{
      const remote=c.remote.filter((e,i,all)=>all.findIndex(v=>preferenceJSON(v.value)===preferenceJSON(e.value))===i);
      const columns=[{label:"本机",value:c.local},...(c.pending===undefined ? [] : [{label:"待处理修改",value:c.pending}]),
        ...(remote.length ? remote.map((e,i)=>({label:remote.length>1 ? `飞书版本 ${i+1}` : "飞书",value:e.value})) : [{label:"飞书",value:undefined}])];
      const differences=preferenceDifferences(c.key,columns.map(v=>v.value));
      return <div key={c.key} className="preference-conflict" role="alert">
        <strong>{PREFERENCE_LABELS[c.key]}{remote.length ? "不一致" : "尚未在飞书保存"}</strong>
        <p className="field-hint">仅列出不同项，请选择要保留的设置。{c.pending!==undefined && "待处理修改也已列出，确认后会以所选设置同步。"}</p>
        {!differences.length && <p className="field-hint">{remote.length ? "数值相同，但还有待处理的来源确认，请选择要保留的设置。" : "飞书尚无此项设置，本机也未设置具体目标。确认后可同步本机这份设置。"}</p>}
        <div className="preference-differences">{differences.map(row=><div className="preference-difference" key={row.field}>
          <strong>{row.label}</strong><dl>{columns.map((column,i)=><div key={column.label}><dt>{column.label}</dt><dd>{row.values[i]}</dd></div>)}</dl>
        </div>)}</div>
        <div className="sync-row"><button className="btn-small outline" disabled={status.syncing} onClick={()=>onResolve(c.key)}>保留本机设置</button>
          {remote.map((e,i)=><button className="btn-small outline" key={e.id} disabled={status.syncing} onClick={()=>onResolve(c.key,e.id)}>使用飞书{remote.length>1 ? `版本 ${i+1}` : "设置"}</button>)}
        </div>
      </div>;
    })}
    <p className="field-hint">离线修改保留，联网后同步。当前计时不受影响。窗口和浏览器安装状态各电脑独立。</p>
  </div>;
}
