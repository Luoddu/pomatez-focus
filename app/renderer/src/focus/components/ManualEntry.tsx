import React, { useMemo, useState } from "react";
import { FocusSession, FocusTask } from "../session";
import { parseTitle } from "./shared";

// datetime-local 需要本地时区的 YYYY-MM-DDTHH:mm
const localInputValue = (value: number) => {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function ManualEntry({
  tasks,
  onSave,
  onCancel,
}: {
  tasks: FocusTask[];
  onSave: (record: FocusSession) => void;
  onCancel: () => void;
}) {
  const [taskId, setTaskId] = useState("free");
  const [when, setWhen] = useState(() => localInputValue(Date.now()));
  const [minutes, setMinutes] = useState(25);
  const [count, setCount] = useState(1);
  const [countTouched, setCountTouched] = useState(false);
  const [error, setError] = useState("");
  const maxWhen = useMemo(() => localInputValue(Date.now()), []);
  const groups = useMemo(
    () =>
      tasks
        .filter((t) => t.kind !== "done" && t.kind !== "pending")
        .map((t) => ({
          id: t.id,
          label:
            parseTitle(t.title).name +
            " · 第 " +
            parseTitle(t.title).pomodoro +
            " 个番茄",
        })),
    [tasks]
  );
  const changeMinutes = (value: number) => {
    const mins = Math.round(value);
    setMinutes(mins);
    if (!countTouched)
      setCount(Math.min(100, Math.max(0, Math.floor(mins / 25))));
  };
  const save = () => {
    const startedAt = new Date(when).getTime();
    if (!when || !Number.isFinite(startedAt))
      return setError("请选择开始时间");
    if (startedAt > Date.now())
      return setError("开始时间不能在未来");
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)
      return setError("时长必须是 1–600 分钟");
    if (!Number.isInteger(count) || count < 0 || count > 100)
      return setError("番茄数必须是 0–100 的整数");
    const task: FocusTask =
      tasks.find((t) => t.id === taskId) || {
        id: crypto.randomUUID(),
        title: "自由番茄",
        kind: "free",
        source: "local",
      };
    const seconds = minutes * 60;
    onSave({
      id: crypto.randomUUID(),
      task,
      startedAt,
      endedAt: startedAt + seconds * 1000,
      plannedSeconds: 1500,
      elapsedSeconds: seconds,
      acceptedSeconds: seconds,
      completedCount: count,
      status: "saved",
      syncTarget: "plan",
      // 飞书任务走既有待同步队列；本地任务与自由专注只留本机
      sync: task.source === "feishu" ? "pending" : "local",
    });
  };
  return (
    <div className="card manual-form">
      <div className="manual-row">
        <label htmlFor="manual-task">任务</label>
        <select
          id="manual-task"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
        >
          <option value="free">自由专注</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div className="manual-row">
        <label htmlFor="manual-when">开始时间</label>
        <input
          id="manual-when"
          type="datetime-local"
          value={when}
          max={maxWhen}
          onChange={(e) => setWhen(e.target.value)}
        />
      </div>
      <div className="manual-row">
        <label htmlFor="manual-minutes">时长</label>
        <span className="manual-inline">
          <input
            id="manual-minutes"
            type="number"
            min="1"
            max="600"
            step="1"
            value={minutes}
            onChange={(e) => changeMinutes(Number(e.target.value))}
          />
          分钟
        </span>
      </div>
      <div className="manual-row">
        <label>番茄数</label>
        <span className="stepper">
          <button
            aria-label="减少补记番茄数"
            onClick={() => {
              setCountTouched(true);
              setCount(Math.max(0, count - 1));
            }}
          >
            −
          </button>
          <input
            className="num"
            aria-label="补记番茄数"
            type="number"
            min="0"
            max="100"
            step="1"
            value={count}
            onChange={(e) => {
              setCountTouched(true);
              setCount(
                Math.min(100, Math.max(0, Math.round(Number(e.target.value)) || 0))
              );
            }}
          />
          <button
            aria-label="增加补记番茄数"
            onClick={() => {
              setCountTouched(true);
              setCount(Math.min(100, count + 1));
            }}
          >
            ＋
          </button>
        </span>
      </div>
      {error && <div className="manual-error">{error}</div>}
      <div className="manual-actions">
        <button className="btn-small" onClick={save}>
          保存补记
        </button>
        <button className="btn-small outline" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
