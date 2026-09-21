import React, { useEffect, useRef, useState } from "react";
import { FocusSession, FocusTask, timeParts } from "../session";
import { QUADRANT_TONES } from "../week";
import { Ring, clock, durationText, parseTitle, quadrantMeta } from "./shared";

export default function FocusTimer({
  active,
  tasks,
  onChangeTask,
  blocked,
  restSeconds,
  shownTime,
  onPause,
  onResume,
  onFinish,
}: {
  active: FocusSession;
  tasks: FocusTask[];
  onChangeTask: (id: string) => boolean;
  blocked: boolean;
  restSeconds: number;
  shownTime: string;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const parts = timeParts(active);
  const parsed = parseTitle(active.task.title);
  const quadrant = quadrantMeta(active.task.quadrant);
  const plannedMinutes = Math.round(active.plannedSeconds / 60);
  const gathered = Math.floor(
    active.elapsedSeconds / active.plannedSeconds
  );
  // 「结束」二次确认防误触：第一次进入确认态，3 秒不点自动还原；再点才真结束
  const [confirming, setConfirming] = useState(false);
  const [changing, setChanging] = useState(false);
  const [choice, setChoice] = useState("");
  const options = tasks.filter(
    (t) =>
      t.kind !== "done" && t.kind !== "pending" && t.kind !== "free"
  );
  useEffect(() => setConfirming(false), [active.id]);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);
  // 任务描述默认折叠为 3 行（长备注不再把计时器挤到屏幕外），
  // 需要通读时一键展开；只有内容真的溢出才出现开关
  const [expanded, setExpanded] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);
  const [descOverflow, setDescOverflow] = useState(false);
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setDescOverflow(el.scrollHeight > el.clientHeight + 2);
  }, [active.task.description, expanded]);
  useEffect(() => setExpanded(false), [active.id]);
  const note = restSeconds
    ? "休息中"
    : active.status === "paused"
    ? "已暂停"
    : parts.overtime
    ? "额外时间 · 等待你确认"
    : "专注于当下";
  // 进度弧随任务象限着色（与番茄园/记录列表同一取色口径），无象限保持主题蓝
  const ringTone = active.task.quadrant
    ? QUADRANT_TONES[active.task.quadrant]
    : "#4c6fff";
  return (
    <div className="left-col timing-left">
      <div className="timing-center">
        <div className="card current-task">
          {quadrant && (
            <span className={`pill ${quadrant.pill}`}>
              {quadrant.label}
            </span>
          )}
          <div className="ct-main">
            <div className="ct-name">{parsed.name}</div>
            {active.task.description && (
              <>
                <div
                  ref={descRef}
                  className={`ct-description${expanded ? " expanded" : ""}`}
                >
                  {active.task.description}
                </div>
                {descOverflow && (
                  <button
                    className="btn-text ct-expand"
                    onClick={() => setExpanded((open) => !open)}
                  >
                    {expanded ? "收起备注" : "展开备注"}
                  </button>
                )}
              </>
            )}
            <div className="ct-sub">
              第 {parsed.pomodoro} 个番茄 · 番茄时长 {plannedMinutes}{" "}
              分钟
            </div>
            {!changing ? (
              <button
                className="btn-text change-task-button"
                disabled={blocked}
                onClick={() => {
                  setChoice(
                    active.task.kind === "free"
                      ? "__free__"
                      : active.task.id
                  );
                  setChanging(true);
                }}
              >
                更换任务
              </button>
            ) : (
              <div className="active-task-picker">
                <label htmlFor="active-task-choice">本次专注任务</label>
                <select
                  id="active-task-choice"
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                >
                  <option value="__free__">自由番茄</option>
                  {active.task.kind !== "free" &&
                    !options.some((t) => t.id === active.task.id) && (
                      <option value={active.task.id}>
                        {active.task.title}（当前任务）
                      </option>
                    )}
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {quadrantMeta(t.quadrant)?.label
                        ? `[${quadrantMeta(t.quadrant)!.label}] `
                        : ""}
                      {t.title}
                    </option>
                  ))}
                </select>
                <p>已计时长保留，整段专注记到更换后的任务。</p>
                <div className="active-task-picker-actions">
                  <button
                    className="btn-text"
                    disabled={blocked}
                    onClick={() => {
                      if (onChangeTask(choice)) setChanging(false);
                    }}
                  >
                    确认更换
                  </button>
                  <button
                    className="btn-text"
                    onClick={() => setChanging(false)}
                  >
                    取消更换
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Ring
          size={300}
          stroke={16}
          tone={ringTone}
          progress={active.elapsedSeconds / active.plannedSeconds}
          className={active.status === "paused" ? "is-paused" : ""}
        >
          <div className="ring-time" data-testid="time">
            {shownTime}
          </div>
          <div className="ring-note">{note}</div>
          <div className="ring-elapsed">
            已专注 {clock(active.elapsedSeconds)}
          </div>
        </Ring>
        <div className="timing-chips">
          <span className="chip-item">
            本轮 {plannedMinutes} 分钟
          </span>
          {gathered >= 1 && (
            <span className="chip-item tomato">
              🍅 已积累 {gathered} 个
            </span>
          )}
          {parts.overtime > 0 && (
            <span className="chip-item amber">
              多计时 {durationText(parts.overtime)} · 结束时确认
            </span>
          )}
        </div>
        <div className="timing-buttons">
          <button
            className="btn-outline"
            onClick={active.status === "active" ? onPause : onResume}
          >
            {active.status === "active" ? "暂停" : "继续"}
          </button>
          <button
            className={
              confirming ? "btn-danger-confirm" : "btn-primary"
            }
            aria-label={confirming ? "确认结束" : "结束"}
            onClick={() =>
              confirming ? onFinish() : setConfirming(true)
            }
          >
            {confirming ? "确认结束？" : "结束"}
          </button>
        </div>
      </div>
    </div>
  );
}
