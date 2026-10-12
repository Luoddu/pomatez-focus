import type { FocusSession, FocusTask } from "./session";

// The period owns both defaults; a later count edit never rewrites the period.
export function manualPeriodDefaults(startedAt: number, endedAt: number) {
  const seconds = (endedAt - startedAt) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return {
    minutes: Math.floor(seconds / 60 * 100) / 100,
    count: Math.min(100, Math.floor(seconds / 1500)),
  };
}

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
  const span = (endedAt - startedAt) / 1000;
  const oldEnd = initial?.endedAt ?? initial?.startedAt ?? startedAt;
  const oldSpan = initial ? (oldEnd - initial.startedAt) / 1000 : 0;
  const shifted = initial && !unchanged && Math.abs(span - oldSpan) < 0.000001;
  let segments = unchanged ? initial!.segments : undefined;
  if (initial?.segments && !unchanged) {
    if (shifted) {
      const offset = startedAt - initial.startedAt;
      segments = initial.segments.map(s => ({ start: s.start + offset, end: s.end + offset }));
    } else {
      // Recorded gaps stay at their real clock positions. A manual boundary
      // extension confirms extra work, instead of retaining the old ceiling.
      const active = initial.segments.map(s => ({ start: Math.max(initial.startedAt, s.start), end: Math.min(oldEnd, s.end) }))
        .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start).sort((a,b) => a.start-b.start);
      const pauses: { start: number; end: number }[] = [];
      let cursor = initial.startedAt;
      for (const s of active) { if (s.start > cursor) pauses.push({ start: cursor, end: s.start }); cursor = Math.max(cursor, s.end); }
      if (oldEnd > cursor) pauses.push({ start: cursor, end: oldEnd });
      segments = []; cursor = startedAt;
      for (const p of pauses) {
        const a = Math.max(startedAt, p.start), b = Math.min(endedAt, p.end);
        if (b <= a) continue;
        if (a > cursor) segments.push({ start: cursor, end: a });
        cursor = Math.max(cursor, b);
      }
      if (endedAt > cursor) segments.push({ start: cursor, end: endedAt });
    }
  }
  const elapsed = unchanged
    ? initial!.elapsedSeconds
    : segments
    ? segments.reduce((sum, s) => sum + (s.end - s.start) / 1000, 0)
    : initial
    ? Math.max(0, span - Math.max(0, oldSpan - initial.elapsedSeconds))
    : Math.min(seconds, span);
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
    segments: segments || (initial ? undefined : [
      { start: startedAt, end: startedAt + elapsed * 1000 },
    ]),
    acceptedSeconds: seconds,
    completedCount: count,
    status: "saved",
    syncTarget: "plan",
    sync: task.source === "feishu" ? "pending" : "local",
  };
}
