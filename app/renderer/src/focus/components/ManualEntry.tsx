import React, { useMemo, useState } from "react";
import { FocusSession, FocusTask, Mood } from "../session";
import { MoodPicker, parseTitle } from "./shared";

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
  initial,
}: {
  tasks: FocusTask[];
  onSave: (record: FocusSession) => void;
  onCancel: () => void;
  initial?: FocusSession;
}) {
  const [taskId, setTaskId] = useState(initial?.task.id || "free");
  const [when, setWhen] = useState(() =>
    localInputValue(initial?.startedAt ?? Date.now() - 25 * 60000)
  );
  const [minutes, setMinutes] = useState(
    (initial?.acceptedSeconds ?? 1500) / 60
  );
  const [count, setCount] = useState(initial?.completedCount ?? 1);
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [error, setError] = useState("");
  const maxWhen = useMemo(() => localInputValue(Date.now()), []);
  const groups = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.kind !== "done" &&
            t.kind !== "pending" &&
            t.id !== initial?.task.id
        )
        .map((t) => ({
          id: t.id,
          label:
            parseTitle(t.title).name +
            " · 第 " +
            parseTitle(t.title).pomodoro +
            " 个番茄",
        })),
    [tasks, initial]
  );
  const changeMinutes = (value: number) => {
    const mins = Math.round(value);
    setMinutes(mins);
    if (!initial && Number.isFinite(mins))
      setWhen(localInputValue(Date.now() - mins * 60000));
  };
  const changeCount = (value: number) => {
    const next = Math.min(100, Math.max(0, Math.round(value) || 0));
    setCount(next);
    // 零番茄仍可记录不足一颗的时长，保留用户此前填写的分钟。
    if (!initial && next > 0) changeMinutes(next * 25);
  };
  const save = () => {
    const sameTime =
      !!initial &&
      when === localInputValue(initial.startedAt) &&
      minutes === (initial.acceptedSeconds || 0) / 60;
    const startedAt = sameTime
      ? initial!.startedAt
      : new Date(when).getTime();
    if (!when || !Number.isFinite(startedAt))
      return setError("请选择开始时间");
    if (startedAt > Date.now()) return setError("开始时间不能在未来");
    if (
      !Number.isFinite(minutes) ||
      minutes < (initial ? 0 : 1) ||
      minutes > 600 ||
      (!initial && !Number.isInteger(minutes))
    )
      return setError("时长必须是 1–600 分钟");
    if (!Number.isInteger(count) || count < 0 || count > 100)
      return setError("番茄数必须是 0–100 的整数");
    if (startedAt + minutes * 60000 > Date.now() + 60000)
      return setError("结束时间不能在未来，请调整开始时间或时长");
    const chosen =
      initial?.task.id === taskId
        ? initial.task
        : tasks.find((t) => t.id === taskId);
    if (!chosen && taskId !== "free")
      return setError("所选任务已变化，请重新选择");
    const task: FocusTask = chosen || {
      id: crypto.randomUUID(),
      title: "自由番茄",
      kind: "free",
      source: "local",
    };
    const seconds = minutes * 60;
    try {
      onSave({
        ...initial,
        id: initial?.id || crypto.randomUUID(),
        task,
        startedAt,
        endedAt: sameTime
          ? initial!.endedAt
          : startedAt + seconds * 1000,
        plannedSeconds: initial?.plannedSeconds || 1500,
        elapsedSeconds: sameTime ? initial!.elapsedSeconds : seconds,
        segments: sameTime
          ? initial!.segments
          : [{ start: startedAt, end: startedAt + seconds * 1000 }],
        acceptedSeconds: seconds,
        completedCount: count,
        // 感受只留本机；undefined 会被 JSON 序列化丢弃，等于清除
        mood: mood ?? undefined,
        status: "saved",
        syncTarget: "plan",
        // 飞书任务走既有待同步队列；本地任务与自由专注只留本机
        sync: task.source === "feishu" ? "pending" : "local",
      });
    } catch (e: any) {
      setError(e.message || "保存失败，请重试");
    }
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
          {!initial && <option value="free">自由专注</option>}
          {initial && (
            <option value={initial.task.id}>
              {parseTitle(initial.task.title).name}
            </option>
          )}
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div className="manual-row">
        <label>番茄数</label>
        <span className="stepper">
          <button
            aria-label="减少补记番茄数"
            onClick={() => {
              changeCount(count - 1);
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
              changeCount(Number(e.target.value));
            }}
          />
          <button
            aria-label="增加补记番茄数"
            onClick={() => {
              changeCount(count + 1);
            }}
          >
            ＋
          </button>
        </span>
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
        <label>感受</label>
        <MoodPicker value={mood} onChange={setMood} />
      </div>
      {error && <div className="manual-error">{error}</div>}
      <div className="manual-actions">
        <button className="btn-small" onClick={save}>
          {initial ? "保存修改" : "保存补记"}
        </button>
        <button className="btn-small outline" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
