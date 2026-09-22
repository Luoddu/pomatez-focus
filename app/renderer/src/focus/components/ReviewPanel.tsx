import React from "react";
import { FocusSession, Mood, timeParts } from "../session";
import { MoodPicker, parseTitle } from "./shared";

export default function ReviewPanel({
  active,
  accepted,
  completed,
  mood,
  connected,
  nextAvailable,
  onAccepted,
  onCompleted,
  onMood,
  onSave,
  onSaveRest,
  onSaveNext,
  onDiscard,
  onReturn,
}: {
  active: FocusSession;
  accepted: string;
  completed: number;
  mood: Mood | null;
  connected: boolean;
  nextAvailable: boolean;
  onAccepted: (value: string) => void;
  onCompleted: (value: number) => void;
  onMood: (value: Mood | null) => void;
  onSave: () => void;
  onSaveRest: () => void;
  onSaveNext: () => void;
  onDiscard: () => void;
  onReturn: () => void;
}) {
  const parts = timeParts(active);
  const parsed = parseTitle(active.task.title);
  const plannedMinutes = active.plannedSeconds / 60;
  const planMode = active.syncTarget === "plan";
  // 快选上限：实际分钟/番茄时长向上取整再 +1 封顶（53 分钟/25 分钟 → 可选 0–3）
  const maxCount = Math.min(
    100,
    Math.max(
      1,
      Math.floor((Number(accepted) || 0) / (plannedMinutes || 25)) + 1
    )
  );
  const setCount = (value: number) =>
    onCompleted(Math.min(100, Math.max(0, Math.round(value) || 0)));
  return (
    <div className="left-col review-left">
      <div className="card review-card">
        <h2>本次专注已结束</h2>
        <div className="review-overview">
          本次专注 {Math.round(active.elapsedSeconds / 60)} 分钟 ·
          自动累计 {completed} 个番茄
        </div>
        <div className="review-task">
          {active.task.kind === "free"
            ? "自由番茄"
            : `${parsed.name} · 第 ${parsed.pomodoro} 个番茄`}
        </div>
        <div className="form-row">
          <label>实际专注时长</label>
          <span className="value">
            <input
              aria-label="实际专注分钟"
              type="number"
              min="0"
              step="0.01"
              value={accepted}
              onChange={(e) => onAccepted(e.target.value)}
            />{" "}
            分钟
          </span>
          <span className="sub">
            基础 {Math.floor(parts.base / 60)} 分钟 + 额外{" "}
            {Math.floor(parts.overtime / 60)} 分钟
          </span>
        </div>
        {parts.overtime > 0 && (
          <div className="form-row review-choices">
            <label>额外时间</label>
            <button
              className="btn-text"
              onClick={() =>
                onAccepted((Math.floor(parts.base) / 60).toFixed(2))
              }
            >
              只计基础时间
            </button>
            <button
              className="btn-text"
              onClick={() =>
                onAccepted(
                  (Math.floor(active.elapsedSeconds) / 60).toFixed(2)
                )
              }
            >
              额外时间也计入
            </button>
          </div>
        )}
        <div className="form-row">
          <label>完成番茄数</label>
          <span
            className="quick-counts"
            role="group"
            aria-label="完成番茄数"
          >
            {Array.from({ length: maxCount + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                className={`count-btn${
                  completed === n ? " selected" : ""
                }`}
                aria-pressed={completed === n}
                aria-label={`${n} 个番茄`}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </span>
          <span className="sub">
            {planMode
              ? `此番茄之前已记录 ${(
                  (active.task.creditedSeconds || 0) / 60
                ).toFixed(2)} 分钟；分钟台账仍只记在本行。选 N 个会把本行和后面连续共 N 行番茄都标记已完成，今天不够的行自动补齐。`
              : `已按每 ${plannedMinutes} 分钟 1 个番茄自动累计，点选修改`}
          </span>
        </div>
        <div className="form-row">
          <label>本次感受</label>
          <MoodPicker value={mood} onChange={onMood} />
          <span className="sub">
            可选，只记在本机；难受的番茄会长出小刺
          </span>
        </div>
        <div className="review-actions">
          <button className="btn-primary" onClick={onSave}>
            记录番茄
          </button>
          <button className="btn-outline" onClick={onSaveRest}>
            保存并休息 5 分钟
          </button>
          <button
            className="btn-outline"
            disabled={!nextAvailable}
            title={
              nextAvailable
                ? "保存后开始同任务的下一个番茄"
                : "该任务没有下一个番茄"
            }
            onClick={onSaveNext}
          >
            保存并开始下一个
          </button>
          <button
            className="btn-ghost-danger discard"
            onClick={onDiscard}
          >
            放弃本次
          </button>
          <button
            className="btn-outline return-timing"
            title="未保存任何记录，回到暂停中的计时继续"
            onClick={onReturn}
          >
            返回继续计时
          </button>
        </div>
        <div className="review-foot">
          {active.task.source !== "feishu"
            ? "保存到本机；此记录没有绑定飞书连接。"
            : planMode
            ? active.task.kind === "free" && !active.task.planId
              ? "确认后在飞书原番茄表新增自由番茄。"
              : "确认后分钟累计到飞书本番茄行；选 N 个番茄会从本行起连续标记 N 行已完成，今天不够的行自动补建。"
            : "此旧版记录继续同步到专注会话表，不自动勾选任务。"}
        </div>
      </div>
    </div>
  );
}
