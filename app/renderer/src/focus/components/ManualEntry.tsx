import React, { useMemo, useState } from "react";
import { FocusSession, FocusTask, Mood } from "../session";
import { MoodPicker, parseTitle } from "./shared";
import {
  manualRecord,
  manualWindow,
  focusTimeLabel,
} from "../manualRecord";

// datetime-local 需要本地时区的 YYYY-MM-DDTHH:mm
const localInputValue = (value: number) => {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19);
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
  const [endWhen, setEndWhen] = useState(() =>
    localInputValue(initial?.endedAt ?? Date.now())
  );
  const [customName, setCustomName] = useState("");
  const [count, setCount] = useState(initial?.completedCount ?? 1);
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [error, setError] = useState("");
  const [adjusted, setAdjusted] = useState(false);
  const timestamps = (startValue: string, endValue: string) => ({
    startedAt:
      initial && startValue === localInputValue(initial.startedAt)
        ? initial.startedAt
        : new Date(startValue).getTime(),
    endedAt:
      initial &&
      endValue === localInputValue(initial.endedAt ?? initial.startedAt)
        ? initial.endedAt!
        : new Date(endValue).getTime(),
  });
  const current = timestamps(when, endWhen);
  const available = manualWindow(
    initial,
    current.startedAt,
    current.endedAt,
    minutes * 60
  ).availableSeconds;
  const adjustWindow = (startValue: string, endValue: string) => {
    setError("");
    const { startedAt, endedAt } = timestamps(startValue, endValue);
    if (
      !initial ||
      !Number.isFinite(startedAt) ||
      !Number.isFinite(endedAt) ||
      endedAt < startedAt
    )
      return;
    const limit = manualWindow(
      initial,
      startedAt,
      endedAt,
      minutes * 60
    ).availableSeconds;
    if (minutes * 60 > limit) {
      // 向下保留两位分钟，避免四舍五入后再次超过实际有效时间。
      setMinutes(Math.floor((limit / 60) * 100) / 100);
      setAdjusted(true);
    }
  };
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
    const mins = value;
    setMinutes(mins);
    setError("");
    setAdjusted(false);
    if (!initial && Number.isFinite(mins))
      setWhen(
        localInputValue(new Date(endWhen).getTime() - mins * 60000)
      );
  };
  const changeCount = (value: number) => {
    const next = Math.min(100, Math.max(0, Math.round(value) || 0));
    setCount(next);
    // 零番茄仍可记录不足一颗的时长，保留用户此前填写的分钟。
    if (!initial && next > 0) changeMinutes(next * 25);
  };
  const save = () => {
    const { startedAt, endedAt } = current;
    if (!when || !Number.isFinite(startedAt))
      return setError("请选择开始时间");
    if (startedAt > Date.now()) return setError("开始时间不能在未来");
    if (
      !Number.isFinite(minutes) ||
      minutes < (initial ? 0 : 1) ||
      minutes > 600
    )
      return setError("时长必须是 1–600 分钟");
    if (!Number.isInteger(count) || count < 0 || count > 100)
      return setError("番茄数必须是 0–100 的整数");
    const chosen =
      initial?.task.id === taskId
        ? initial.task
        : tasks.find((t) => t.id === taskId);
    if (!chosen && taskId !== "free")
      return setError("所选任务已变化，请重新选择");
    const task: FocusTask = chosen || {
      id: crypto.randomUUID(),
      title: customName.trim() || "自由番茄",
      kind: "free",
      source: "local",
    };
    const seconds = minutes * 60;
    try {
      onSave({
        ...manualRecord({
          initial,
          id: crypto.randomUUID(),
          task,
          startedAt,
          endedAt,
          seconds,
          count,
          now: Date.now(),
        }),
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
      {!initial && taskId === "free" && (
        <div className="manual-row">
          <label htmlFor="manual-name">名称</label>
          <input
            id="manual-name"
            type="text"
            maxLength={120}
            placeholder="为这次专注取个名字"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
        </div>
      )}
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
            min={initial ? 0 : 1}
            max="600"
            step="0.01"
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
          step="1"
          onChange={(e) => {
            setWhen(e.target.value);
            adjustWindow(e.target.value, endWhen);
            const at = new Date(e.target.value).getTime();
            if (!initial && Number.isFinite(at))
              setEndWhen(localInputValue(at + minutes * 60000));
          }}
        />
      </div>
      <div className="manual-row">
        <label htmlFor="manual-end">结束时间</label>
        <input
          id="manual-end"
          type="datetime-local"
          step="1"
          value={endWhen}
          max={maxWhen}
          onChange={(e) => {
            setEndWhen(e.target.value);
            adjustWindow(when, e.target.value);
            if (!initial)
              setMinutes(
                (new Date(e.target.value).getTime() -
                  new Date(when).getTime()) /
                  60000
              );
          }}
        />
      </div>
      {initial &&
        Number.isFinite(available) &&
        current.endedAt >= current.startedAt && (
          <div className="manual-time-hint" role="status">
            此时段最多可计入 {focusTimeLabel(available)}（已扣除暂停）。
            {adjusted && "时长已自动调小，番茄数保持不变；可继续微调。"}
          </div>
        )}
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
