import React, {useState} from "react";
import type {FocusTask, ProjectType} from "../session";
import CategorySelect from "./CategorySelect";
import ManualEntryDialog from "./ManualEntryDialog";
import {parseTitle} from "./shared";

export default function TaskCategoryEditor({task,onSave,onClose}:{task:FocusTask;onSave:(task:FocusTask,type:ProjectType|"")=>void;onClose:()=>void}) {
  const [type,setType]=useState<ProjectType|"">(task.tomatoType || task.projectType || "");
  const [error,setError]=useState("");
  return <ManualEntryDialog title="修改番茄类型" onClose={onClose}>
    <div className="manual-form"><strong>{parseTitle(task.title).name}</strong>
      <div className="manual-row"><label id="manual-category-label" htmlFor="manual-category">番茄类型</label>
        <CategorySelect value={type} onChange={setType}/></div>
      <small>同一任务的历史和后续番茄一起更新</small>
      {error && <p role="alert">{error}</p>}
      <button className="btn-small" onClick={()=>{try{onSave(task,type);onClose();}catch(e:any){setError(e.message);}}}>保存类型</button>
    </div>
  </ManualEntryDialog>;
}
