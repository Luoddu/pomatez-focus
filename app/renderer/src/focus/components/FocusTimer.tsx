import React, { useEffect, useState } from "react";
import { FocusSession, timeParts } from "../session";
import { Ring, durationText, parseTitle, quadrantMeta } from "./shared";

export default function FocusTimer({
  active,
  restSeconds,
  shownTime,
  onPause,
  onResume,
  onFinish,
}: {
  active: FocusSession;
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
  useEffect(() => setConfirming(false), [active.id]);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);
  const note = restSeconds
    ? "休息中"
    : active.status === "paused"
    ? "已暂停"
    : parts.overtime
    ? "额外时间 · 等待你确认"
    : "专注于当下";
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
              <div className="ct-description">
                {active.task.description}
              </div>
            )}
            <div className="ct-sub">
              第 {parsed.pomodoro} 个番茄 · 番茄时长 {plannedMinutes}{" "}
              分钟
            </div>
          </div>
        </div>
        <Ring
          size={300}
          stroke={16}
          progress={active.elapsedSeconds / active.plannedSeconds}
        >
          <div className="ring-time" data-testid="time">
            {shownTime}
          </div>
          <div className="ring-note">{note}</div>
        </Ring>
        <div className="timing-hints">
          {gathered >= 1 && (
            <span className="gather-note">
              已积累 {gathered} 个番茄
            </span>
          )}
          {parts.overtime > 0 && (
            <span className="amber-note">
              本轮 {plannedMinutes} 分钟已到 · 已多计时{" "}
              {durationText(parts.overtime)}，结束时确认
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
