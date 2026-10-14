import React from "react";
import { PREFERENCE_LABELS, PreferenceKey, preferenceJSON } from "../preferences";
import { PreferenceSyncStatus } from "../preferenceSync";

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
    {status.conflicts.map(c=><div key={c.key} className="preference-conflict" role="alert">
      <strong>{PREFERENCE_LABELS[c.key]}存在不同版本</strong>
      <details><summary>查看差异</summary><p>本机：{preferenceJSON(c.local)}</p>{c.remote.map(e=><p key={e.id}>飞书：{preferenceJSON(e.value)}</p>)}</details>
      <div className="sync-row"><button className="btn-small outline" disabled={status.syncing} onClick={()=>onResolve(c.key)}>保留本机设置</button>
        {c.remote.map((e,i)=><button className="btn-small outline" key={e.id} disabled={status.syncing} onClick={()=>onResolve(c.key,e.id)}>使用飞书{c.remote.length>1 ? `版本 ${i+1}` : "设置"}</button>)}
      </div>
    </div>)}
    <p className="field-hint">离线修改保留，联网后同步。当前计时不受影响。窗口和浏览器安装状态各电脑独立。</p>
  </div>;
}
