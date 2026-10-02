import React, { useEffect, useState } from "react";
import type { FocusQuadrant, FocusProject } from "../session";
import { PROJECT_LABELS, PROJECT_TONES } from "../week";
export default function QuickTaskEntry({
  quadrant,
  onAdd,
  onClose,
  loadProjects,
}: {
  quadrant: FocusQuadrant;
  onAdd: (
    title: string,
    quadrant: FocusQuadrant,
    count: number,
    project?: FocusProject
  ) => void;
  onClose: () => void;
  loadProjects?: () => Promise<FocusProject[]>;
}) {
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<FocusProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(!!loadProjects);
  const [projectError, setProjectError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!loadProjects) return;
    setLoading(true);
    setProjectError("");
    loadProjects()
      .then((rows) => {
        if (!cancelled) setProjects(rows);
      })
      .catch((e) => {
        if (!cancelled)
          setProjectError(e.message || "项目暂未加载，可以稍后重试");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadProjects, retry]);
  const project = projects.find((p) => p.id === projectId);
  return (
    <form
      className="quick-task-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (!title.trim() || title.trim().length > 200)
            throw Error("请输入 1–200 字的任务名称");
          if (!Number.isInteger(count) || count < 1 || count > 50)
            throw Error("计划番茄数应为 1–50");
          onAdd(title.trim(), quadrant, count, project);
          onClose();
        } catch (err: any) {
          setError(err.message);
        }
      }}
    >
      <input
        autoFocus
        aria-label="新增任务名称"
        placeholder="临时要做什么？"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
      />
      <label className="quick-project">
        <span>所属项目</span>
        <span
          className="quick-project-swatch"
          style={{
            background: project?.projectType
              ? PROJECT_TONES[project.projectType]
              : "#d5dce3",
          }}
        />
        <select
          aria-label="新增任务所属项目"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">暂不归属（浅灰）</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.projectType
                ? ` · ${PROJECT_LABELS[p.projectType]}`
                : ""}
            </option>
          ))}
        </select>
      </label>
      {loading && (
        <small role="status">正在读取飞书项目，仍可先添加任务</small>
      )}
      {projectError && (
        <small role="status">
          {projectError}{" "}
          <button
            type="button"
            className="btn-text"
            onClick={() => setRetry((n) => n + 1)}
          >
            重试项目
          </button>
        </small>
      )}
      <div className="manual-inline">
        <label>
          今日番茄{" "}
          <input
            aria-label="新增任务番茄数"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <button className="btn-small" type="submit">
          添加
        </button>
        <button className="btn-text" type="button" onClick={onClose}>
          取消
        </button>
      </div>
      {error && (
        <div role="alert" className="manual-error">
          {error}
        </div>
      )}
    </form>
  );
}
