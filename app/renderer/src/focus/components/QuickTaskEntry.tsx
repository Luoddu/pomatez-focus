import React, { useEffect, useState, useRef } from "react";
import type { FocusQuadrant, FocusProject } from "../session";
import { PROJECT_LABELS, PROJECT_TONES } from "../week";
export default function QuickTaskEntry({
  quadrant,
  onAdd,
  onClose,
  loadProjects,
  initial,
}: {
  quadrant: FocusQuadrant;
  onAdd: (
    title: string,
    quadrant: FocusQuadrant,
    count: number,
    project?: FocusProject
  ) => void;
  onClose: () => void;
  loadProjects?: (refresh?: boolean) => Promise<FocusProject[]>;
  initial?: { title: string; count: number };
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [count, setCount] = useState(initial?.count || 1);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<FocusProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(!!loadProjects);
  const [projectError, setProjectError] = useState("");
  const [retry, setRetry] = useState(0);
  const previousLoader = useRef<typeof loadProjects>();
  useEffect(() => {
    let cancelled = false;
    if (!loadProjects) return;
    setLoading(true);
    setProjectError("");
    const changedSource = previousLoader.current !== loadProjects;
    previousLoader.current = loadProjects;
    if (changedSource) {
      setProjects([]);
      setProjectId("");
    }
    loadProjects(!changedSource && retry > 0)
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
          if (projectId && !project)
            throw Error("原项目已不可用，请重新选择项目或暂不归属");
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
        <span>所属项目（可选）</span>
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
          disabled={!projects.length && !projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">暂不归属（浅灰）</option>
          {projectId && !project && (
            <option value={projectId} disabled>
              原项目已不可用，请重新选择
            </option>
          )}
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
      {loadProjects && !projectError && (
        <button
          type="button"
          className="btn-text"
          disabled={loading}
          onClick={() => setRetry((n) => n + 1)}
        >
          {loading ? "正在读取项目…" : "刷新项目"}
        </button>
      )}
      {loading && (
        <small role="status">
          正在读取项目；不归属项目可直接确认，已有列表仍可使用。
        </small>
      )}
      {!loading &&
        !projectError &&
        loadProjects &&
        !projects.length && (
          <small role="status">飞书项目表暂无可选项目。</small>
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
          {initial
            ? projectId
              ? "确认整理"
              : "暂不归属，确认整理"
            : "添加"}
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
