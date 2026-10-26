import React, { useRef, useState } from "react";
import { QuickTask } from "../editQueue";
import { FocusProject, FocusQuadrant } from "../session";
import QuickTaskEntry from "./QuickTaskEntry";
import { QUADRANTS } from "./shared";

export default function FocusCapture({title,onTitle,items,allowEntry,canCapture,canOrganize,onCapture,onOrganize,loadProjects}: {
  title:string;onTitle:(value:string)=>void;items:QuickTask[];canCapture:boolean;canOrganize:boolean;
  allowEntry:boolean;
  onCapture:(title:string)=>void;onOrganize:(before:QuickTask,title:string,quadrant:FocusQuadrant,count:number,project?:FocusProject)=>void;
  loadProjects:()=>Promise<FocusProject[]>;
}) {
  const [error,setError]=useState("");
  const [inputOpen,setInputOpen]=useState(false);
  const [expanded,setExpanded]=useState(canOrganize);
  const [editing,setEditing]=useState<QuickTask|null>(null);
  const [quadrant,setQuadrant]=useState<FocusQuadrant>("unu");
  const composing=useRef(false);
  if(!allowEntry&&!items.length)return null;
  const pendingButton=!!items.length&&<button className="btn-text capture-count" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>待整理 {items.length}</button>;
  return <section className={`focus-capture${allowEntry&&inputOpen?" is-open":" is-quiet"}`} aria-label="临时事项">
    {allowEntry&&inputOpen?<form className="capture-input" onSubmit={e=>{e.preventDefault();if(composing.current)return;try{
      if(!canCapture)throw Error("任务尚未就绪，请稍后记下");
      if(!title.trim()||title.trim().length>200)throw Error("请输入 1–200 字的临时事项");
      onCapture(title.trim());onTitle("");setError("");setInputOpen(false);
    }catch(err:any){setError(err.message);}}}>
      <input autoFocus aria-label="随手记临时事项" placeholder="临时想到什么？回车记下，结束后整理" value={title} maxLength={200}
        onChange={e=>onTitle(e.target.value)} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
        onKeyDown={e=>{if(e.key==="Enter"&&(composing.current||(e.nativeEvent as any).isComposing||e.keyCode===229))e.preventDefault();}} />
      <button type="submit" className="btn-small" disabled={!canCapture||!title.trim()}>记下</button>
      <button type="button" className="btn-text capture-close" aria-label="收起随手记" onClick={()=>setInputOpen(false)}>收起</button>
      {pendingButton}
    </form>:<div className="capture-launch-row">
      {allowEntry&&<button type="button" className="capture-toggle" aria-expanded={false} onClick={()=>setInputOpen(true)}>随手记</button>}
      {pendingButton}
    </div>}
    {error&&<div className="manual-error" role="alert">{error}</div>}
    {!!items.length&&expanded&&<div className="capture-items">
      {items.map(q=><div className="capture-item" key={q.id}>
        <span className="capture-tomato" aria-hidden="true">◯</span><span className="capture-title">{q.title}</span>
        <button type="button" className="btn-text" disabled={!canOrganize} onClick={()=>{setEditing(q);setQuadrant(q.quadrant||"unu");}}>整理</button>
      </div>)}
      {!canOrganize&&<small>已记下，结束当前专注后再整理。</small>}
    </div>}
    {editing&&canOrganize&&<div className="capture-editor">
      <label>任务象限 <select aria-label="临时事项象限" value={quadrant} onChange={e=>setQuadrant(e.target.value as FocusQuadrant)}>{QUADRANTS.map(q=><option key={q.key} value={q.key}>{q.label}</option>)}</select></label>
      <QuickTaskEntry key={editing.id} initial={{title:editing.title,count:editing.count}} quadrant={quadrant} loadProjects={loadProjects}
        onClose={()=>setEditing(null)} onAdd={(name,q,count,project)=>{onOrganize(editing,name,q,count,project);setEditing(null);}} />
    </div>}
  </section>;
}
