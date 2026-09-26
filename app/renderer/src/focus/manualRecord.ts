import type { FocusSession, FocusTask } from "./session";

// 表单预览与保存共用同一有效时间窗口；暂停不计入专注。
export function manualWindow(
  initial: FocusSession | undefined,
  startedAt: number,
  endedAt: number,
  seconds: number
) {
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
  return {
    segments,
    elapsed,
    availableSeconds: Math.max(0, Math.min(elapsed, span)),
  };
}

export function focusTimeLabel(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)} 分 ${whole % 60} 秒`;
}

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
  const { segments, elapsed, availableSeconds } = manualWindow(
    initial,
    startedAt,
    endedAt,
    seconds
  );
  if (seconds > Math.ceil(availableSeconds))
    throw Error(
      `实际专注时长超过可计入上限 ${focusTimeLabel(
        availableSeconds
      )}（已扣除暂停），请减少时长或调整结束时间`
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
