export type FocusQuadrant = "iu" | "inu" | "uni" | "unu";
export type FocusTask = {
  id: string;
  title: string;
  source: "local" | "feishu";
  planId?: string;
  taskId?: string;
  sourceKey?: string;
  // free=自由番茄；done=今日已全部完成的占位行；pending=± 乐观更新的临时行
  kind?: "free" | "done" | "pending";
  creditedSeconds?: number;
  goalSeconds?: number;
  appliedSessionIds?: string[];
  // 已收 x/y：x=今日已完成番茄，y=今日计划总数（含已完成+待办）
  doneToday?: number;
  plannedToday?: number;
  // iu=重要且紧急 inu=重要不紧急 uni=紧急不重要 unu=不紧急不重要; 缺省=未分类
  quadrant?: FocusQuadrant;
};
export type FocusSession = {
  id: string;
  task: FocusTask;
  startedAt: number;
  endedAt?: number;
  plannedSeconds: number;
  elapsedSeconds: number;
  acceptedSeconds?: number;
  completedCount?: number;
  status: "active" | "paused" | "review" | "saved";
  recovered?: boolean;
  syncTarget?: "plan";
  syncedPlanId?: string;
  segments?: { start: number; end: number }[];
  segmentOpen?: boolean;
  sync: "local" | "pending" | "synced";
};

export function advanceSession(
  session: FocusSession,
  seconds: number,
  at = Date.now()
): FocusSession {
  if (!Number.isFinite(seconds) || seconds < 0)
    throw new Error("Invalid elapsed time");
  if (session.status !== "active") return session;
  const segments = session.segments
    ? session.segments.map((s) => ({ ...s }))
    : undefined;
  if (segments && seconds > 0) {
    const last = segments[segments.length - 1];
    if (session.segmentOpen && last) last.end = at;
    else
      segments.push({
        start: Math.max(
          session.startedAt,
          at - seconds * 1000,
          last?.end || 0
        ),
        end: at,
      });
  }
  return {
    ...session,
    elapsedSeconds: session.elapsedSeconds + seconds,
    ...(segments ? { segments, segmentOpen: true } : {}),
  };
}

export function timeParts(session: FocusSession) {
  return {
    remaining: Math.max(
      0,
      session.plannedSeconds - session.elapsedSeconds
    ),
    base: Math.min(session.plannedSeconds, session.elapsedSeconds),
    overtime: Math.max(
      0,
      session.elapsedSeconds - session.plannedSeconds
    ),
  };
}

export function confirmSession(
  session: FocusSession,
  acceptedSeconds: number,
  completedCount: number
): FocusSession {
  if (session.status !== "review")
    throw new Error("Session is not awaiting confirmation");
  if (
    !Number.isFinite(acceptedSeconds) ||
    acceptedSeconds < 0 ||
    acceptedSeconds > Math.ceil(session.elapsedSeconds)
  ) {
    throw new Error("专注时长必须在 0 与本次记录时长之间");
  }
  if (
    !Number.isInteger(completedCount) ||
    completedCount < 0 ||
    completedCount > 100
  ) {
    throw new Error("完成番茄数必须是 0–100 的整数");
  }
  return {
    ...session,
    acceptedSeconds,
    // 番茄数由 review 屏快选确认（默认值按分钟/番茄时长自动累计）；
    // 原表行的“已完成”勾选仍由 mergePlan 的分钟台账独立推导，与此数无关
    completedCount,
    status: "saved",
    sync: session.task.source === "feishu" ? "pending" : "local",
  };
}

// 结束确认屏「返回继续计时」：review 时尚未写入任何记录，纯状态恢复——
// 回到暂停中的计时状态，保留已积累分钟、暂停历史（segments）与任务；
// endedAt 清掉，再次结束时由 finish 重设
export function returnFromReview(
  session: FocusSession | null
): FocusSession | null {
  if (!session || session.status !== "review") return session;
  const { endedAt, ...rest } = session;
  return { ...rest, status: "paused", segmentOpen: false };
}

export function restoreSession(
  session: FocusSession | null
): FocusSession | null {  if (!session || session.status === "saved") return null;
  if (
    !session.id ||
    !session.task?.id ||
    !Number.isFinite(session.elapsedSeconds) ||
    session.elapsedSeconds < 0 ||
    !Number.isFinite(session.plannedSeconds) ||
    session.plannedSeconds <= 0
  ) {
    throw new Error("专注记录损坏，请先导出本地数据再恢复");
  }
  return {
    ...session,
    status: session.status === "review" ? "review" : "paused",
    recovered: true,
    segmentOpen: false,
  };
}

export function upsertRecord(
  records: FocusSession[],
  record: FocusSession
) {
  return [record, ...records.filter((r) => r.id !== record.id)];
}
