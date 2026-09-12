import React from "react";
import { FocusSession, timeParts } from "../session";
import { Ring } from "./shared";

export default function MiniView({
  active,
  taskTitle,
  shownTime,
  pinned,
  onPause,
  onResume,
  onFinish,
  onExpand,
  onTogglePin,
}: {
  active: FocusSession | null;
  taskTitle: string;
  shownTime: string;
  pinned: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onExpand: () => void;
  onTogglePin: () => void;
}) {
  const parts = active ? timeParts(active) : null;
  const reviewing = active?.status === "review";
  const foot = !active
    ? "选择番茄后开始"
    : active.status === "paused"
    ? "已暂停"
    : parts?.overtime
    ? "额外时间 · 结束时确认"
    : "专注于当下";
  return (
    <main className="mini-body">
      <div className="mini-controls">
        <button
          className={`ghost-btn ${pinned ? "selected" : ""}`}
          title={pinned ? "取消置顶" : "置顶小窗"}
          aria-label="置顶"
          aria-pressed={pinned}
          onClick={onTogglePin}
        >
          ⌖
        </button>
        <button
          className="ghost-btn"
          title="展开"
          aria-label="切换小窗"
          onClick={onExpand}
        >
          ↗
        </button>
      </div>
      <div className="mini-task">{taskTitle || "请选择番茄"}</div>
      <Ring
        size={132}
        stroke={10}
        className="mini-ring"
        progress={
          active ? active.elapsedSeconds / active.plannedSeconds : 0
        }
      >
        <div className="ring-time" data-testid="time">
          {shownTime}
        </div>
      </Ring>
      {active && !reviewing && (
        <div className="mini-buttons">
          <button
            className="btn-outline"
            onClick={active.status === "active" ? onPause : onResume}
          >
            {active.status === "active" ? "暂停" : "继续"}
          </button>
          <button className="btn-primary" onClick={onFinish}>
            结束
          </button>
        </div>
      )}
      {reviewing && (
        <div className="mini-buttons">
          <button className="btn-primary" onClick={onExpand}>
            展开并确认
          </button>
        </div>
      )}
      <div className="mini-foot">{foot}</div>
    </main>
  );
}
