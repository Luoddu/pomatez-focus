import React, { useEffect, useRef, useState } from "react";
import type { FocusProject, FocusTask, ProjectType } from "../session";
import { PROJECT_LABELS } from "../week";
import ManualEntryDialog from "./ManualEntryDialog";
import { api, parseTitle } from "./shared";

type ProjectChoices = {
  sourceKey: string;
  taskTable: string;
  projectTable: string;
  projects: FocusProject[];
  currentIds: string[];
};

export type TaskProjectReceipt = {
  sourceKey: string;
  taskId: string;
  projectType?: ProjectType;
};

export default function TaskProjectEditor({ task, onClose, onSaved }: {
  task: FocusTask;
  onClose: () => void;
  onSaved: (receipt: TaskProjectReceipt) => void;
}) {
  const { sourceKey, taskId } = task;
  const [choices, setChoices] = useState<ProjectChoices | null>(null);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  const original = choices?.currentIds ?? [];
  const projectNames = original.map(id => choices?.projects.find(p => p.id === id)?.name ?? "未列出的项目");
  const desired = selection ? [selection] : [];
  const changed = selection !== "__keep__" && JSON.stringify(desired) !== JSON.stringify(original);
  useEffect(() => {
    let cancelled = false;
    setChoices(null);
    setError("");
    setLoading(true);
    api().taskProjects({sourceKey, taskId}).then((result: ProjectChoices) => {
      if (cancelled) return;
      if (result.sourceKey !== sourceKey) throw Error("飞书连接已变化，请重新打开任务");
      const [first] = result.currentIds;
      const listed = result.currentIds.length === 1 && result.projects.some(p => p.id === first);
      setSelection(listed ? first : first ? "__keep__" : "");
      setChoices(result);
    }).catch((err: Error) => {
      if (!cancelled) setError(err.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sourceKey, taskId, attempt]);

  return (
    <ManualEntryDialog title="修改所属项目" onClose={() => { if (!savingRef.current) onClose(); }}>
      <form className="manual-form quick-task-form" onSubmit={async e => {
        e.preventDefault();
        if (!choices || !changed || savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        setError("");
        try {
          const receipt: TaskProjectReceipt = await api().updateTaskProject({
            sourceKey, taskId, taskTable: choices.taskTable, projectTable: choices.projectTable,
            currentIds: original, projectId: selection || null,
          });
          if (receipt.sourceKey !== sourceKey || receipt.taskId !== taskId)
            throw Error("项目保存回执与当前任务不一致，请重新读取");
          onSaved(receipt);
          onClose();
        } catch (err: any) {
          setError(err.message || "项目未能确认保存，请重新读取");
        } finally {
          savingRef.current = false;
          setSaving(false);
        }
      }}>
        <strong>{parseTitle(task.title).name}</strong>
        {choices && <small>当前归属 {projectNames.join("、") || "暂不归属"}</small>}
        <label className="quick-project">
          <span>所属项目</span>
          <select value={selection} disabled={!choices || saving} onChange={e => setSelection(e.target.value)}>
            <option value="">{loading ? "正在读取项目…" : "暂不归属（浅灰）"}</option>
            {selection === "__keep__" && <option value="__keep__">保留当前归属</option>}
            {choices?.projects.map(p => <option key={p.id} value={p.id}>
              {p.name}{p.projectType ? ` · ${PROJECT_LABELS[p.projectType]}` : ""}
            </option>)}
          </select>
        </label>
        {error && <div role="alert" className="manual-error">{error}</div>}
        <div className="manual-inline">
          <button type="submit" className="btn-small" disabled={!choices || !changed || loading || saving}>
            {saving ? "正在保存…" : "保存项目"}
          </button>
          {error && <button type="button" className="btn-text" disabled={loading || saving} onClick={() => setAttempt(n => n + 1)}>重新读取项目</button>}
        </div>
      </form>
    </ManualEntryDialog>
  );
}
