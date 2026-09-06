export type FocusTask = {
  id: string;
  title: string;
  source: "local" | "feishu";
  planId?: string;
  taskId?: string;
  sourceKey?: string;
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
  sync: "local" | "pending" | "synced";
};

export function advanceSession(
  session: FocusSession,
  seconds: number
): FocusSession {
  if (!Number.isFinite(seconds) || seconds < 0)
    throw new Error("Invalid elapsed time");
  if (session.status !== "active") return session;
  return {
    ...session,
    elapsedSeconds: session.elapsedSeconds + seconds,
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
    completedCount,
    status: "saved",
    sync: session.task.source === "feishu" ? "pending" : "local",
  };
}

export function restoreSession(
  session: FocusSession | null
): FocusSession | null {
  if (!session || session.status === "saved") return null;
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
  };
}

export function upsertRecord(
  records: FocusSession[],
  record: FocusSession
) {
  return [record, ...records.filter((r) => r.id !== record.id)];
}
