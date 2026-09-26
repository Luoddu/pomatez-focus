import type { FocusSession, FocusTask } from "./session";

export function manualRecord(input: {
  initial?: FocusSession;
  task: FocusTask;
  startedAt: number;
  endedAt: number;
  seconds: number;
  count: number;
  now: number;
  id: string;
}): FocusSession {
  const { initial, task, startedAt, endedAt, seconds, count, now, id } =
    input;
  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(endedAt) ||
    startedAt < 946684800000 ||
    endedAt < startedAt ||
    endedAt > now + 60000
  )
    throw Error("请填写有效的开始与结束时间，结束不能早于开始或在未来");
  if (
    !Number.isFinite(seconds) ||
    seconds < (initial ? 0 : 60) ||
    seconds > 36000
  )
    throw Error("实际专注时长必须在 1–600 分钟");
  if (!Number.isInteger(count) || count < 0 || count > 100)
    throw Error("番茄数必须是 0–100 的整数");
  const unchanged =
    initial &&
    startedAt === initial.startedAt &&
    endedAt === initial.endedAt;
  const segments = unchanged
    ? initial!.segments
    : initial?.segments
        ?.map((s) => ({
          start: Math.max(
            startedAt,
            s.start + (startedAt - initial!.startedAt)
          ),
          end: Math.min(
            endedAt,
            s.end + (startedAt - initial!.startedAt)
          ),
        }))
        .filter((s) => s.end > s.start);
  const span = (endedAt - startedAt) / 1000;
  const elapsed = unchanged
    ? initial!.elapsedSeconds
    : segments
    ? segments.reduce((sum, s) => sum + (s.end - s.start) / 1000, 0)
    : Math.min(initial?.elapsedSeconds ?? seconds, span);
  if (seconds > Math.ceil(elapsed) || seconds > Math.ceil(span))
    throw Error(
      "实际专注时长超过所选时段中的专注时间，请调整时长或结束时间"
    );
  return {
    ...initial,
    id: initial?.id || id,
    task,
    startedAt,
    endedAt,
    plannedSeconds: initial?.plannedSeconds || 1500,
    elapsedSeconds: elapsed,
    segments: segments || [
      { start: startedAt, end: startedAt + elapsed * 1000 },
    ],
    acceptedSeconds: seconds,
    completedCount: count,
    status: "saved",
    syncTarget: "plan",
    sync: task.source === "feishu" ? "pending" : "local",
  };
}
